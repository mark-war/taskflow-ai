// teams.js
import express from "express";
import auth from "../middleware/auth.js";
import { Team, User, Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

const VALID_ROLES = ["owner", "admin", "member", "viewer"];

// ============================================================
// GET /api/teams
// List all active teams the current user belongs to
// ============================================================
router.get("/", protect, async (req, res, next) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar lastSeen")
      .sort({ updatedAt: -1 });

    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/teams
// Create a new team
// ============================================================
router.post("/", protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    const slug =
      `${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`.slice(
        0,
        40,
      );

    const team = await Team.create({
      name: name.trim(),
      slug,
      description: description?.trim() || "",
      owner: req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { teams: team._id } });

    await Activity.create({
      type: "team_created",
      actor: req.user._id,
      team: team._id,
      message: `${req.user.name} created team "${team.name}"`,
    });

    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// GET /api/teams/:id
// ============================================================
router.get("/:id", protect, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar lastSeen");

    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// PATCH /api/teams/:id
// Update team metadata (name, description only)
// ============================================================
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!team) return res.status(404).json({ error: "Team not found" });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// POST /api/teams/:id/members
// Add a member to the team by userId
// ============================================================
router.post("/:id/members", protect, async (req, res, next) => {
  try {
    const { userId, role = "member" } = req.body;

    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!VALID_ROLES.includes(role)) {
      return res
        .status(400)
        .json({ error: `Role must be one of: ${VALID_ROLES.join(", ")}` });
    }

    const [team, user] = await Promise.all([
      Team.findById(req.params.id),
      User.findById(userId),
    ]);

    if (!team) return res.status(404).json({ error: "Team not found" });
    if (!user) return res.status(404).json({ error: "User not found" });

    const alreadyMember = team.members.some(
      (m) => m.user.toString() === userId,
    );
    if (alreadyMember)
      return res.status(409).json({ error: "Already a member" });

    team.members.push({ user: userId, role });
    await team.save();
    await User.findByIdAndUpdate(userId, { $addToSet: { teams: team._id } });

    await Activity.create({
      type: "member_added",
      actor: req.user._id,
      team: team._id,
      message: `${req.user.name} added ${user.name} to ${team.name}`,
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// DELETE /api/teams/:id/members/:userId
// Remove a member from the team
// ============================================================
router.delete("/:id/members/:userId", protect, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const isOwner = team.owner.toString() === req.params.userId;
    if (isOwner) {
      return res.status(403).json({ error: "Cannot remove the team owner" });
    }

    team.members = team.members.filter(
      (m) => m.user.toString() !== req.params.userId,
    );
    await team.save();
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { teams: team._id },
    });

    await Activity.create({
      type: "member_removed",
      actor: req.user._id,
      team: team._id,
      message: `${req.user.name} removed a member from ${team.name}`,
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

export default router;
