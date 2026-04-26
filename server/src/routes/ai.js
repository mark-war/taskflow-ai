import express from "express";
import auth from "../middleware/auth.js";
import {
  processCommand,
  streamCommand,
  generateStandup,
  enrichTask,
} from "../services/aiService.js";
import Task from "../models/Task.js";
import Board from "../models/Board.js";
import { User, Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

// Helper: build board context for AI
async function getBoardContext(boardId, userId) {
  const board = await Board.findById(boardId).populate(
    "members.user",
    "name email avatar",
  );
  if (!board)
    throw Object.assign(new Error("Board not found"), { status: 404 });

  const user = await User.findById(userId).select("name email");

  const tasks = await Task.find({
    board: boardId,
    status: { $ne: "archived" },
  })
    .populate("assignees", "name email")
    .lean();

  const byStatus = Object.entries(
    tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {}),
  ).map(([s, c]) => `${c} ${s}`);

  const members = board.members.map((m) => ({
    id: m.user._id.toString(),
    name: m.user.name,
    email: m.user.email,
  }));

  return {
    board,
    members,
    tasks,
    currentUser: user,
    taskObjects: tasks,
    byStatus,
  };
}

// Helper: resolve assignee names to user IDs
async function resolveAssignees(names, teamMembers) {
  return teamMembers
    .filter((m) =>
      names.some((n) => m.name.toLowerCase().includes(n.toLowerCase())),
    )
    .map((m) => m.id);
}

// Helper: apply filter to tasks
function applyFilter(tasks, filter) {
  return tasks.filter((t) => {
    if (filter.column && t.column !== filter.column) return false;
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.sprint && t.sprint !== filter.sprint) return false;
    if (filter.blocked && (!t.blockedBy || t.blockedBy.length === 0))
      return false;
    if (filter.overdue && (!t.dueDate || new Date(t.dueDate) >= new Date()))
      return false;
    if (
      filter.titleContains &&
      !t.title.toLowerCase().includes(filter.titleContains.toLowerCase())
    )
      return false;

    if (filter.assigneeName) {
      const hasAssignee = t.assignees?.some((a) =>
        a.name?.toLowerCase().includes(filter.assigneeName.toLowerCase()),
      );
      if (!hasAssignee) return false;
    }

    if (
      filter.dueBefore &&
      t.dueDate &&
      new Date(t.dueDate) >= new Date(filter.dueBefore)
    )
      return false;
    if (
      filter.dueAfter &&
      t.dueDate &&
      new Date(t.dueDate) <= new Date(filter.dueAfter)
    )
      return false;

    return true;
  });
}

// ============================================================
// POST /api/ai/command
// Main AI command endpoint with tool execution
// ============================================================
router.post("/command", protect, async (req, res, next) => {
  try {
    const { command, boardId } = req.body;

    if (!command?.trim()) {
      return res.status(400).json({ error: "Command is required" });
    }

    const ctx = await getBoardContext(boardId, req.user._id);

    const aiResult = await processCommand(command, {
      board: ctx.board,
      members: ctx.members,
      tasks: { total: ctx.taskObjects.length, byStatus: ctx.byStatus },
      currentUser: ctx.currentUser,
    });

    const executedActions = [];
    const io = req.app.get("io");

    // Execute each tool call returned by the AI
    for (const toolCall of aiResult.toolCalls) {
      const { name, arguments: argsStr } = toolCall.function;

      let args;
      try {
        args = JSON.parse(argsStr);
      } catch {
        continue;
      }

      switch (name) {
        case "create_task": {
          const assigneeIds = args.assigneeNames
            ? await resolveAssignees(args.assigneeNames, ctx.members)
            : [];

          const task = await Task.create({
            title: args.title,
            description: args.description || "",
            board: boardId,
            column: args.column || "todo",
            priority: args.priority || "medium",
            type: args.type || "task",
            assignees: assigneeIds,
            dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
            tags: args.tags || [],
            sprint: args.sprint || null,
            createdBy: req.user._id,
            reporter: req.user._id,
          });

          await task.populate("assignees", "name email avatar");

          io?.to(`board:${boardId}`).emit("task:created", task);

          executedActions.push({ action: "create_task", task });
          break;
        }

        case "update_tasks":
        case "move_tasks": {
          const filter =
            name === "move_tasks"
              ? { column: args.fromColumn, ...(args.filter || {}) }
              : args.filter;

          const updates =
            name === "move_tasks"
              ? { column: args.toColumn, status: args.toColumn }
              : args.updates;

          const matching = applyFilter(ctx.taskObjects, filter);

          if (matching.length === 0) {
            executedActions.push({ action: name, affected: 0 });
            break;
          }

          const dbUpdates = { ...updates };

          if (dbUpdates.assigneeNames) {
            dbUpdates.assignees = await resolveAssignees(
              dbUpdates.assigneeNames,
              ctx.members,
            );
            delete dbUpdates.assigneeNames;
          }

          if (dbUpdates.dueDate) {
            dbUpdates.dueDate = new Date(dbUpdates.dueDate);
          }

          await Task.updateMany(
            { _id: { $in: matching.map((t) => t._id) } },
            { $set: dbUpdates },
          );

          io?.to(`board:${boardId}`).emit("tasks:updated", {
            ids: matching.map((t) => t._id.toString()),
            updates: dbUpdates,
          });

          executedActions.push({ action: name, affected: matching.length });
          break;
        }

        case "query_tasks": {
          const matching = applyFilter(ctx.taskObjects, args.filter);

          const sorted = matching
            .sort((a, b) => {
              if (args.sortBy === "priority") {
                const order = { critical: 0, high: 1, medium: 2, low: 3 };
                return (order[a.priority] || 2) - (order[b.priority] || 2);
              }
              if (args.sortBy === "dueDate") {
                return new Date(a.dueDate) - new Date(b.dueDate);
              }
              return new Date(b.createdAt) - new Date(a.createdAt);
            })
            .slice(0, args.limit || 20);

          executedActions.push({ action: "query_tasks", results: sorted });
          break;
        }

        case "bulk_delete": {
          const matching = applyFilter(ctx.taskObjects, args.filter);

          if (!args.confirm) {
            executedActions.push({
              action: "bulk_delete_pending",
              count: matching.length,
              requiresConfirmation: true,
            });
          } else {
            await Task.deleteMany({
              _id: { $in: matching.map((t) => t._id) },
            });

            io?.to(`board:${boardId}`).emit("tasks:deleted", {
              ids: matching.map((t) => t._id.toString()),
            });

            executedActions.push({
              action: "bulk_delete",
              affected: matching.length,
            });
          }
          break;
        }
      }
    }

    // Log AI activity after executing all actions
    await Activity.create({
      type: "ai_action",
      actor: req.user._id,
      board: boardId,
      team: ctx.board.team,
      message: `AI executed: "${command.slice(0, 100)}"`,
      meta: { command, actionsCount: executedActions.length },
    });

    res.json({
      text: aiResult.text,
      actions: executedActions,
      usage: aiResult.usage,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/ai/enrich/:taskId
// Enrich a task with AI-generated metadata
// ============================================================
router.post("/enrich/:taskId", protect, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const enrichment = await enrichTask(task);

    if (enrichment) {
      task.aiSummary = enrichment.summary;
      task.aiSuggestedPriority = enrichment.suggestedPriority;
      task.aiEstimatedHours = enrichment.estimatedHours;

      if (enrichment.suggestedTags?.length) {
        task.tags = [...new Set([...task.tags, ...enrichment.suggestedTags])];
      }

      await task.save();
    }

    res.json({ enrichment, task });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/ai/standup
// ============================================================
router.post("/standup", protect, async (req, res, next) => {
  try {
    const { boardId, memberName, period } = req.body;

    const tasks = await Task.find({ board: boardId })
      .populate("assignees", "name")
      .lean();

    const standup = await generateStandup(tasks, memberName, period || "today");

    res.json({ standup });
  } catch (err) {
    next(err);
  }
});

export default router;
