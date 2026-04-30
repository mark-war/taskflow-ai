import jsonwebtoken from "jsonwebtoken";
const { verify } = jsonwebtoken;
import { User, Team } from "../models/index.js";

// Middleware to protect routes and ensure user is authenticated
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "-password -refreshTokens",
    );
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Middleware to check if user is a member of the team with required role
const requireTeamMember =
  (minRole = "member") =>
  async (req, res, next) => {
    try {
      const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ error: "Team not found" });

      const rolePriority = { viewer: 0, member: 1, admin: 2, owner: 3 };
      const member = team.members.find(
        (m) => m.user.toString() === req.user._id.toString(),
      );
      if (!member || rolePriority[member.role] < rolePriority[minRole]) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.team = team;
      req.teamRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };

export default { protect, requireTeamMember };
