import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import auth from "../middleware/auth.js";
import { Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

// ============================================================
// Multer setup (local storage)
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ============================================================
// POST /api/files/upload
// Upload a file (task/board attachment)
// ============================================================
router.post(
  "/upload",
  protect,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { boardId, taskId } = req.body;

      const fileUrl = `/uploads/${req.file.filename}`;

      const fileData = {
        filename: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedBy: req.user._id,
      };

      // Optional: log activity
      if (boardId) {
        await Activity.create({
          type: "file_attached",
          actor: req.user._id,
          board: boardId,
          task: taskId || null,
          message: `${req.user.name} uploaded a file`,
          meta: fileData,
        });

        const io = req.app.get("io");
        io?.to(`board:${boardId}`).emit("file:uploaded", fileData);
      }

      res.status(201).json({
        message: "File uploaded successfully",
        file: fileData,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================
// GET /api/files/:filename
// Serve uploaded files
// ============================================================
router.get("/:filename", (req, res) => {
  const filePath = path.join(process.cwd(), "uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.sendFile(filePath);
});

// ============================================================
// DELETE /api/files/:filename
// Delete file
// ============================================================
router.delete("/:filename", protect, async (req, res, next) => {
  try {
    const filePath = path.join(process.cwd(), "uploads", req.params.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    fs.unlinkSync(filePath);

    const io = req.app.get("io");
    io?.emit("file:deleted", { filename: req.params.filename });

    res.json({ message: "File deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
