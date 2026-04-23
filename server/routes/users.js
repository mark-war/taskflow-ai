// users.js
import { Router } from "express";
const router = Router();
import auth from "../middleware/auth.js";
import { User } from "../models/index.js";

const { protect } = auth;
router.get("/search", protect, async (req, res, next) => {
  try {
    const { q, teamId } = req.query;
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
      teams: teamId,
      isActive: true,
    })
      .select("name email avatar")
      .limit(10);
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", protect, async (req, res, next) => {
  try {
    const allowed = ["name", "avatar", "timezone", "preferences"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k)),
    );
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true },
    );
    res.json({ user: user.toPublic() });
  } catch (err) {
    next(err);
  }
});

export default router;
