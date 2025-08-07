// server/routes/auth.ts
import express from "express";
import { verify_token } from "../controllers/auth-controller/verify-token";
import { register_user } from "../controllers/auth-controller/register";

const router = express.Router();

router.post("/verify-token", verify_token);
router.post("/auth/register", register_user);

export default router;
