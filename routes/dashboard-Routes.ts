import express from 'express';
import { get_dashboard_stats } from '../controllers/dashboard-controller/get-Dashboard-Stats';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.get('/dashboard/stats', authMiddleware, get_dashboard_stats);

export default router; 