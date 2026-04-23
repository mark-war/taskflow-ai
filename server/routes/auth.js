import { Router } from "express";
const router = Router();
import jsonwebtoken from "jsonwebtoken";
const { sign, verify } = jsonwebtoken;
import { User, Team } from "../models/index.js";
import auth from "../middleware/auth.js";
const { protect } = auth;
const signToken = (id) =>
  sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
const signRefresh = (id) =>
  sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, teamName } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password });

    // Auto-create a personal team
    const slug =
      `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`.slice(0, 40);
    const team = await Team.create({
      name: teamName || `${name}'s Team`,
      slug,
      owner: user._id,
      members: [{ user: user._id, role: "owner" }],
    });

    user.teams.push(team._id);
    await user.save();

    const token = signToken(user._id);
    const refreshToken = signRefresh(user._id);
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
    });

    res.status(201).json({
      token,
      refreshToken,
      user: user.toPublic(),
      team,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.isActive)
      return res.status(403).json({ error: "Account is deactivated" });

    user.lastSeen = new Date();
    await user.save();

    const token = signToken(user._id);
    const refreshToken = signRefresh(user._id);
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: refreshToken },
    });

    const userWithTeams = await User.findById(user._id).populate(
      "teams",
      "name slug color avatar",
    );

    res.json({ token, refreshToken, user: userWithTeams.toPublic() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ error: "Refresh token required" });

    const decoded = verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshTokens");
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newToken = signToken(user._id);
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", protect, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: refreshToken },
      });
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "teams",
    "name slug color avatar",
  );
  res.json({ user: user.toPublic() });
});

export default router;
