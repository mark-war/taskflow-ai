import express from "express";
import auth from "../middleware/auth.js";
import { Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

/**
 * GET /api/activity
 * Global activity feed (user scope)
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const { teamId, boardId, limit = 50, page = 1 } = req.query;

    const query = {};

    if (teamId) query.team = teamId;
    if (boardId) query.board = boardId;

    const activity = await Activity.find(query)
      .populate("actor", "name avatar")
      .populate("task", "title")
      .populate("board", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Activity.countDocuments(query);

    res.json({
      activity,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activity/team/:teamId
 */
router.get("/team/:teamId", protect, async (req, res, next) => {
  try {
    const activity = await Activity.find({
      team: req.params.teamId,
    })
      .populate("actor", "name avatar")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activity/board/:boardId
 */
router.get("/board/:boardId", protect, async (req, res, next) => {
  try {
    const activity = await Activity.find({
      board: req.params.boardId,
    })
      .populate("actor", "name avatar")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/activity/task/:taskId
 */
router.get("/task/:taskId", protect, async (req, res, next) => {
  try {
    const activity = await Activity.find({
      task: req.params.taskId,
    })
      .populate("actor", "name avatar")
      .sort({ createdAt: -1 });

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/activity/:id
 * (optional admin cleanup)
 */
router.delete("/:id", protect, async (req, res, next) => {
  try {
    await Activity.findByIdAndDelete(req.params.id);
    res.json({ message: "Activity deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
