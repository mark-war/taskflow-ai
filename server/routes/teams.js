import express from "express";
import auth from "../middleware/auth.js";
import { Team, User, Activity } from "../models/index.js";

const router = express.Router();
const { protect } = auth;

/**
 * GET /api/teams
 * Get all teams for current user
 */
router.get("/", protect, async (req, res, next) => {
  try {
    const teams = await Team.find({
      "members.user": req.user._id,
      isActive: true,
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ updatedAt: -1 });

    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post("/", protect, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const team = await Team.create({
      name,
      slug,
      description: description || "",
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "owner",
        },
      ],
    });

    await Activity.create({
      type: "member_added",
      actor: req.user._id,
      team: team._id,
      message: `${req.user.name} created team "${team.name}"`,
    });

    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/teams/:id
 */
router.get("/:id", protect, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/teams/:id
 */
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true },
    );

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/teams/:id/members
 * Add member to team
 */
router.post("/:id/members", protect, async (req, res, next) => {
  try {
    const { userId, role = "member" } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exists = team.members.some((m) => m.user.toString() === userId);

    if (!exists) {
      team.members.push({ user: userId, role });
      await team.save();
    }

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

/**
 * DELETE /api/teams/:id/members/:userId
 */
router.delete("/:id/members/:userId", protect, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: "Team not found" });

    team.members = team.members.filter(
      (m) => m.user.toString() !== req.params.userId,
    );

    await team.save();

    await Activity.create({
      type: "member_removed",
      actor: req.user._id,
      team: team._id,
      message: `Member removed from ${team.name}`,
    });

    res.json({ team });
  } catch (err) {
    next(err);
  }
});

export default router;
