// server/routes/auth.ts
import express from "express";
import { verify_token } from "../controllers/auth-controller/verify-token";
import { register_user } from "../controllers/auth-controller/register";
import { update_user_role } from "../controllers/auth-controller/update-role";
import { convert_team_to_individual } from "../controllers/auth-controller/convert-team-to-individual";
import { validate_team_code } from "../controllers/auth-controller/validate-team-code";
import auth_middleware from "../middlewares/auth-Middleware";

const router = express.Router();

router.post("/verify-token", verify_token);
router.post("/auth/register", register_user);

// Role update requires authentication
router.post("/auth/update-role", auth_middleware, update_user_role);

// Convert team to individual requires authentication
router.post("/auth/convert-team-to-individual", auth_middleware, convert_team_to_individual);

// Validate team code (requires authentication)
router.post("/auth/validate-team-code", auth_middleware, validate_team_code);

export default router;
