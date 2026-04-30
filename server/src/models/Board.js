import { Schema, model } from "mongoose";

// Column schema to manage columns within a board
const columnSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  color: { type: String, default: "#6366f1" },
  position: { type: Number, default: 0 },
  wipLimit: { type: Number, default: null }, // work-in-progress limit
  isCollapsed: { type: Boolean, default: false },
});

// Sprint schema to manage sprints within a board
const sprintSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  goal: { type: String, default: "" },
  status: {
    type: String,
    enum: ["planning", "active", "completed"],
    default: "planning",
  },
});

// Main Board schema
const boardSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "📋" },
    color: { type: String, default: "#6366f1" },
    background: { type: String, default: null },

    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["viewer", "editor", "admin"],
          default: "editor",
        },
      },
    ],

    columns: [columnSchema],
    sprints: [sprintSchema],
    activeSprint: { type: String, default: null },

    defaultView: {
      type: String,
      enum: ["kanban", "timeline", "list", "calendar"],
      default: "kanban",
    },

    isArchived: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, default: null },

    settings: {
      allowSubtasks: { type: Boolean, default: true },
      requireDueDate: { type: Boolean, default: false },
      autoArchiveDone: { type: Boolean, default: false },
      autoArchiveDays: { type: Number, default: 7 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Static method to get default columns for a new board
boardSchema.statics.defaultColumns = () => [
  { id: "backlog", title: "Backlog", color: "#94a3b8", position: 0 },
  { id: "todo", title: "To Do", color: "#6366f1", position: 1 },
  { id: "in_progress", title: "In Progress", color: "#f59e0b", position: 2 },
  { id: "in_review", title: "In Review", color: "#8b5cf6", position: 3 },
  { id: "done", title: "Done", color: "#10b981", position: 4 },
];

boardSchema.index({ team: 1 });
boardSchema.index({ "members.user": 1 });

export default model("Board", boardSchema);
