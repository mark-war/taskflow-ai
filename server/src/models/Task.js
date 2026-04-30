// ============================================================
// Task Model
// ============================================================
import { Schema, model } from "mongoose";

// Subtask and Comment schemas are embedded within Task for simplicity and performance.
const subtaskSchema = new Schema(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Comments can have mentions and attachments, and are stored as an array within the Task document for quick access.
const commentSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [
      { filename: String, url: String, size: Number, mimetype: String },
    ],
  },
  { timestamps: true },
);

// The main Task schema includes references to Board, Users, and other Tasks for dependencies. It also has fields for status, priority, type, and AI-generated insights.
const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 500 },
    description: { type: String, default: "" },
    board: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    column: { type: String, required: true }, // column id within board
    position: { type: Number, default: 0 }, // order within column

    status: {
      type: String,
      default: "todo",
      // No enum — status mirrors the column id, which can be custom
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "medium",
    },
    type: {
      type: String,
      enum: ["task", "bug", "story", "epic", "milestone"],
      default: "task",
    },

    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reporter: { type: Schema.Types.ObjectId, ref: "User" },
    team: { type: Schema.Types.ObjectId, ref: "Team" },

    dueDate: { type: Date },
    startDate: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },

    sprint: { type: String, default: null },
    tags: [{ type: String, trim: true }],
    labels: [{ name: String, color: String }],

    subtasks: [subtaskSchema],
    comments: [commentSchema],
    attachments: [
      {
        filename: String,
        url: String,
        size: Number,
        mimetype: String,
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "Task" }],

    // AI-generated fields
    aiSummary: { type: String, default: null },
    aiSuggestedPriority: { type: String, default: null },
    aiEstimatedHours: { type: Number, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field to calculate subtask completion percentage for progress tracking.
taskSchema.virtual("subtaskProgress").get(function () {
  if (!this.subtasks.length) return null;
  const done = this.subtasks.filter((s) => s.completed).length;
  return Math.round((done / this.subtasks.length) * 100);
});

taskSchema.index({ board: 1, column: 1, position: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ sprint: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ title: "text", description: "text" });

export default model("Task", taskSchema);
