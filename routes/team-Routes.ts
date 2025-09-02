import express from "express";
import { get_team_info } from "../controllers/team-controller/get-team-info";
import { join_team } from "../controllers/team-controller/join-team";
import auth_middleware from "../middlewares/auth-Middleware";

const router = express.Router();

// All team routes require authentication
router.use(auth_middleware);

// Get team information for current user
router.get("/team", get_team_info);

// Join an existing team
router.post("/team/join", join_team);

export default router;
