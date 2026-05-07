import { Router } from "express";
import auth from "../middleware/auth.js";
import Task from "../models/Task.js";
import { Activity } from "../models/index.js";

const router = Router();
const { protect } = auth;

// GET /api/tasks
router.get("/", protect, async (req, res, next) => {
  try {
    const {
      boardId,
      column,
      sprint,
      assignee,
      priority,
      search,
      page = 1,
      limit = 500,
    } = req.query;
    const query = { board: boardId, status: { $ne: "archived" } };
    if (column) query.column = column;
    if (sprint) query.sprint = sprint;
    if (assignee) query.assignees = assignee;
    if (priority) query.priority = priority;
    if (search) query.$text = { $search: search };

    const tasks = await Task.find(query)
      .populate("assignees", "name email avatar")
      .populate("reporter", "name avatar")
      .sort({ column: 1, position: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Task.countDocuments(query);
    res.json({
      tasks,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post("/", protect, async (req, res, next) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user._id,
      reporter: req.user._id,
    });
    await task.populate("assignees", "name email avatar");

    req.app.get("io")?.to(`board:${task.board}`).emit("task:created", task);

    await Activity.create({
      type: "task_created",
      actor: req.user._id,
      board: task.board,
      task: task._id,
      message: `${req.user.name} created "${task.title}"`,
    });

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/reorder/bulk  — must come BEFORE /:id to avoid route conflict
router.patch("/reorder/bulk", protect, async (req, res, next) => {
  try {
    const { updates } = req.body; // [{ id, column, position }]
    if (!updates?.length) return res.json({ message: "Nothing to reorder" });

    const ops = updates.map(({ id, column, position }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { column, position } },
      },
    }));
    await Task.bulkWrite(ops);
    res.json({ message: "Reordered" });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get("/:id", protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignees", "name email avatar")
      .populate("reporter", "name avatar")
      .populate("comments.author", "name email avatar")
      .populate("subtasks.assignee", "name avatar")
      .populate("dependencies", "title status priority")
      .populate("blockedBy", "title status priority");

    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const prev = await Task.findById(req.params.id).lean();
    if (!prev) return res.status(404).json({ error: "Task not found" });

    const updates = { ...req.body };
    if (updates.status === "done" && prev.status !== "done")
      updates.completedAt = new Date();
    if (updates.status !== "done" && prev.status === "done")
      updates.completedAt = null;

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).populate("assignees", "name email avatar");

    req.app.get("io")?.to(`board:${task.board}`).emit("task:updated", task);

    if (updates.column && updates.column !== prev.column) {
      await Activity.create({
        type: "task_moved",
        actor: req.user._id,
        board: task.board,
        task: task._id,
        message: `${req.user.name} moved "${task.title}" to ${updates.column}`,
        meta: { from: prev.column, to: updates.column },
      });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    req.app
      .get("io")
      ?.to(`board:${task.board}`)
      .emit("task:deleted", { id: task._id });
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/comments
router.post("/:id/comments", protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ error: "Comment content required" });

    // Push the comment
    await Task.findByIdAndUpdate(req.params.id, {
      $push: {
        comments: {
          author: req.user._id,
          content: content.trim(),
        },
      },
    });

    // Re-fetch with full population so author name/avatar is correct immediately
    const task = await Task.findById(req.params.id).populate(
      "comments.author",
      "name email avatar",
    );

    const comment = task.comments.at(-1);

    req.app.get("io")?.to(`board:${task.board}`).emit("task:commented", {
      taskId: task._id,
      comment,
    });

    res.json({ comment });
  } catch (err) {
    next(err);
  }
});

export default router;
