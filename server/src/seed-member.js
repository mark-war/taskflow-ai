/**
 * Seed extra team member for testing assignments & real-time collaboration.
 *
 * Run: node src/seed-member.mjs
 *
 * Creates:
 *   sarah@taskflow.ai / member1234
 *   john@taskflow.ai  / member1234
 *
 * Both are added to the Demo Workspace team and Product Roadmap board.
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function seedMembers() {
  if (!process.env.MONGODB_URI) {
    console.error("❌  MONGODB_URI not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  MongoDB connected");

  const { User, Team } = await import("./models/index.js");
  const { default: Board } = await import("./models/Board.js");

  // Find the demo team
  const team = await Team.findOne({ name: "Demo Workspace" });
  if (!team) {
    console.error("❌  Demo Workspace not found. Run seed.mjs first.");
    process.exit(1);
  }

  const board = await Board.findOne({ name: "Product Roadmap" });

  const members = [
    { name: "Sarah Chen", email: "sarah@taskflow.ai", avatar: null },
    { name: "John Reyes", email: "john@taskflow.ai", avatar: null },
    { name: "Maria Santos", email: "maria@taskflow.ai", avatar: null },
  ];

  for (const m of members) {
    // Remove existing if any
    const existing = await User.findOne({ email: m.email });
    if (existing) {
      await User.deleteOne({ _id: existing._id });
      console.log(`🧹  Removed existing ${m.email}`);
    }

    // Create user
    const user = await User.create({
      name: m.name,
      email: m.email,
      password: "member1234",
      role: "user",
      teams: [team._id],
    });

    // Add to team if not already there
    const alreadyInTeam = team.members.some(
      (tm) => tm.user.toString() === user._id.toString(),
    );
    if (!alreadyInTeam) {
      team.members.push({ user: user._id, role: "member" });
    }

    // Add to board
    if (board) {
      const alreadyInBoard = board.members.some(
        (bm) => bm.user.toString() === user._id.toString(),
      );
      if (!alreadyInBoard) {
        board.members.push({ user: user._id, role: "editor" });
      }
    }

    console.log(`👤  Created ${m.name} (${m.email})`);
  }

  await team.save();
  if (board) await board.save();

  await mongoose.disconnect();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉  Team members ready!");
  console.log("");
  console.log("   sarah@taskflow.ai  /  member1234");
  console.log("   john@taskflow.ai   /  member1234");
  console.log("   maria@taskflow.ai  /  member1234");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

seedMembers().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
