/**
 * Seed script (ESM) — creates a demo workspace you can log in to immediately.
 *
 * Run from server/:   node src/seed.mjs
 * Run from root:      node server/src/seed.mjs
 *
 * Demo credentials:
 *   Email:    demo@taskflow.ai
 *   Password: demo1234
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root regardless of where node is invoked from
dotenv.config({ path: path.join(__dirname, "../.env") });

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error(
      "❌  MONGODB_URI not set. Copy server/.env → server/.env",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  MongoDB connected");

  // Import models after connection is established
  const { User, Team } = await import("./models/index.js");
  const { default: Board } = await import("./models/Board.js");
  const { default: Task } = await import("./models/Task.js");

  // Clean previous demo data
  const existing = await User.findOne({ email: "demo@taskflow.ai" });
  if (existing) {
    await Task.deleteMany({ createdBy: existing._id });
    await Board.deleteMany({ owner: existing._id });
    await Team.deleteMany({ owner: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log("🧹  Cleared previous demo data");
  }

  // 1. Create demo user
  const user = await User.create({
    name: "Demo User",
    email: "demo@taskflow.ai",
    password: "demo1234",
    role: "user",
  });
  console.log("👤  Created demo user:", user.email);

  // 2. Create team
  const team = await Team.create({
    name: "Demo Workspace",
    slug: `demo-workspace-${Date.now()}`,
    owner: user._id,
    members: [{ user: user._id, role: "owner" }],
  });
  // updateOne avoids re-hashing the password via .save()
  await User.updateOne({ _id: user._id }, { $set: { teams: [team._id] } });
  console.log("🏢  Created team:", team.name);

  // 3. Create board
  const board = await Board.create({
    name: "Product Roadmap",
    emoji: "🚀",
    description: "AI-powered project tracker demo board",
    team: team._id,
    owner: user._id,
    createdBy: user._id,
    members: [{ user: user._id, role: "admin" }],
    columns: Board.defaultColumns(),
  });
  console.log("📋  Created board:", board.name);

  // 4. Sample tasks
  const taskData = [
    {
      title: "Set up CI/CD pipeline",
      column: "done",
      status: "done",
      priority: "high",
      type: "task",
      tags: ["devops", "infra"],
    },
    {
      title: "Design system tokens & components",
      column: "done",
      status: "done",
      priority: "medium",
      type: "task",
      tags: ["design"],
    },
    {
      title: "JWT auth + refresh token flow",
      column: "done",
      status: "done",
      priority: "critical",
      type: "task",
      tags: ["auth"],
    },
    {
      title: "Build AI command bar with Groq",
      column: "in_progress",
      status: "in_progress",
      priority: "critical",
      type: "story",
      tags: ["ai", "core"],
    },
    {
      title: "Real-time collaboration via Socket.IO",
      column: "in_progress",
      status: "in_progress",
      priority: "high",
      type: "story",
      tags: ["realtime"],
    },
    {
      title: "API rate limiting broken for AI endpoints",
      column: "in_progress",
      status: "in_progress",
      priority: "critical",
      type: "bug",
      tags: ["bug", "api"],
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // due in 2 days
    },
    {
      title: "Kanban drag & drop with DnD Kit",
      column: "in_review",
      status: "in_review",
      priority: "high",
      type: "task",
      tags: ["frontend"],
    },
    {
      title: "File attachments to tasks (S3 / local)",
      column: "todo",
      status: "todo",
      priority: "medium",
      type: "task",
      tags: ["files"],
    },
    {
      title: "AI standup generator",
      column: "todo",
      status: "todo",
      priority: "low",
      type: "story",
      tags: ["ai"],
      aiSummary: "Generate daily standups from task activity using Groq LLM.",
    },
    {
      title: "Write onboarding guide for new team members",
      column: "todo",
      status: "todo",
      priority: "low",
      type: "task",
      tags: ["docs"],
      dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // overdue yesterday
    },
    {
      title: "Sprint planning & timeline view",
      column: "backlog",
      status: "backlog",
      priority: "medium",
      type: "epic",
      tags: ["timeline"],
    },
    {
      title: "Dashboard analytics & burn-down chart",
      column: "backlog",
      status: "backlog",
      priority: "low",
      type: "story",
      tags: ["analytics"],
    },
    {
      title: "Mobile responsive layout",
      column: "backlog",
      status: "backlog",
      priority: "medium",
      type: "task",
      tags: ["mobile"],
    },
    {
      title: "Dark mode polish",
      column: "backlog",
      status: "backlog",
      priority: "low",
      type: "task",
      tags: ["design"],
    },
  ];

  const tasks = await Task.insertMany(
    taskData.map((t, i) => ({
      ...t,
      board: board._id,
      position: i,
      assignees: [user._id],
      reporter: user._id,
      createdBy: user._id,
      completedAt: t.status === "done" ? new Date() : null,
    })),
  );
  console.log(`✅  Created ${tasks.length} sample tasks`);

  await mongoose.disconnect();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉  Demo workspace ready!");
  console.log("");
  console.log("   URL       →  http://localhost:3000");
  console.log("   Email     →  demo@taskflow.ai");
  console.log("   Password  →  demo1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  console.error(err);
  process.exit(1);
});
