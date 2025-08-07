import express from 'express';
import { get_available_models } from '../controllers/ai-controller/get-Available-Models';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.get('/models', authMiddleware, get_available_models);

export default router; 