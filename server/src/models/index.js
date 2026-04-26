import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

const { hash, compare } = bcrypt;

// ============================================================
// User Model
// ============================================================
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    timezone: { type: String, default: "UTC" },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      notifications: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        taskUpdates: { type: Boolean, default: true },
      },
      defaultView: { type: String, default: "kanban" },
    },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    refreshTokens: [{ type: String, select: false }],
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return compare(candidatePassword, this.password);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

userSchema.index({ email: 1 });
userSchema.index({ teams: 1 });

const User = model("User", userSchema);

// ============================================================
// Team Model
// ============================================================
const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: "" },
    avatar: { type: String, default: null },
    color: { type: String, default: "#6366f1" },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["viewer", "member", "admin", "owner"],
          default: "member",
        },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    maxMembers: { type: Number, default: 5 },

    settings: {
      allowGuestAccess: { type: Boolean, default: false },
      defaultBoardView: { type: String, default: "kanban" },
    },

    inviteCodes: [
      {
        code: String,
        role: { type: String, default: "member" },
        expiresAt: Date,
        usedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

teamSchema.index({ slug: 1 });
teamSchema.index({ "members.user": 1 });

const Team = model("Team", teamSchema);

// ============================================================
// Activity Model
// ============================================================
const activitySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "task_created",
        "task_updated",
        "task_deleted",
        "task_moved",
        "task_assigned",
        "task_completed",
        "comment_added",
        "file_attached",
        "board_created",
        "sprint_started",
        "sprint_completed",
        "member_added",
        "member_removed",
        "ai_action",
      ],
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    board: { type: Schema.Types.ObjectId, ref: "Board" },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    team: { type: Schema.Types.ObjectId, ref: "Team" },
    meta: { type: Schema.Types.Mixed, default: {} },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ team: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });

const Activity = model("Activity", activitySchema);

export { User, Team, Activity };
