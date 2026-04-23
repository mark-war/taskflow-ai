import express from "express";
import auth from "../middleware/auth.js";
import Board from "../models/Board.js";
import Task from "../models/Task.js";
import { Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

// GET /api/boards?teamId=
router.get("/", protect, async (req, res, next) => {
  try {
    const { teamId } = req.query;
    const query = { team: teamId, isArchived: false };

    const boards = await Board.find(query)
      .populate("owner", "name avatar")
      .populate("members.user", "name avatar email")
      .sort({ updatedAt: -1 });

    res.json({ boards });
  } catch (err) {
    next(err);
  }
});

// POST /api/boards
router.post("/", protect, async (req, res, next) => {
  try {
    const board = await Board.create({
      ...req.body,
      owner: req.user._id,
      createdBy: req.user._id,
      columns: req.body.columns || Board.defaultColumns(),
      members: [{ user: req.user._id, role: "admin" }],
    });

    await Activity.create({
      type: "board_created",
      actor: req.user._id,
      board: board._id,
      team: board.team,
      message: `${req.user.name} created board "${board.name}"`,
    });

    res.status(201).json({ board });
  } catch (err) {
    next(err);
  }
});

// GET /api/boards/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate("owner", "name avatar")
      .populate("members.user", "name avatar email");

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/boards/:id
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const board = await Board.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );

    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }

    req.app.get("io")?.to(`board:${board._id}`).emit("board:updated", board);

    res.json({ board });
  } catch (err) {
    next(err);
  }
});

// GET /api/boards/:id/stats
router.get("/:id/stats", protect, async (req, res, next) => {
  try {
    const tasks = await Task.find({ board: req.params.id }).lean();

    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const byPriority = tasks.reduce((acc, t) => {
      acc[t.priority] = (acc[t.priority] || 0) + 1;
      return acc;
    }, {});

    const overdue = tasks.filter(
      (t) =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done",
    ).length;

    const completionRate = tasks.length
      ? Math.round(((byStatus.done || 0) / tasks.length) * 100)
      : 0;

    res.json({
      total: tasks.length,
      byStatus,
      byPriority,
      overdue,
      completionRate,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/boards/:id/activity
router.get("/:id/activity", protect, async (req, res, next) => {
  try {
    const activity = await Activity.find({ board: req.params.id })
      .populate("actor", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

export default router;
