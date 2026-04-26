import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import auth from "../middleware/auth.js";
import { Activity } from "../models/index.js";
import Task from "../models/Task.js";

const router = express.Router();
const { protect } = auth;

// ============================================================
// Multer setup
// ============================================================
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const BLOCKED_EXTENSIONS = [".exe", ".sh", ".bat", ".cmd"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File type not allowed: ${ext}`));
    }
    cb(null, true);
  },
});

// ============================================================
// POST /api/files/upload/:taskId
// Upload one or more files and attach them to a Task
// ============================================================
router.post(
  "/upload/:taskId",
  protect,
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      if (!req.files?.length) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const task = await Task.findById(req.params.taskId);
      if (!task) return res.status(404).json({ error: "Task not found" });

      const attachments = req.files.map((f) => ({
        filename: f.originalname,
        url: `/uploads/${f.filename}`,
        size: f.size,
        mimetype: f.mimetype,
        uploadedBy: req.user._id,
      }));

      task.attachments.push(...attachments);
      await task.save();

      // Log activity
      await Activity.create({
        type: "file_attached",
        actor: req.user._id,
        board: task.board,
        task: task._id,
        message: `${req.user.name} uploaded ${attachments.length} file(s)`,
        meta: { attachments },
      });

      const io = req.app.get("io");
      io?.to(`board:${task.board}`).emit("task:updated", {
        _id: task._id,
        attachments: task.attachments,
      });

      res.status(201).json({ attachments });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// GET /api/files/:filename
// Serve an uploaded file
// ============================================================
router.get("/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.sendFile(filePath);
});

// ============================================================
// DELETE /api/files/:taskId/:filename
// Remove a file from disk and from the Task's attachments
// ============================================================
router.delete("/:taskId/:filename", protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const hadAttachment = task.attachments.some((a) =>
      a.url.includes(req.params.filename),
    );

    if (hadAttachment) {
      task.attachments = task.attachments.filter(
        (a) => !a.url.includes(req.params.filename),
      );
      await task.save();
    }

    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const io = req.app.get("io");
    io?.to(`board:${task.board}`).emit("task:updated", {
      _id: task._id,
      attachments: task.attachments,
    });

    res.json({ message: "File deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
