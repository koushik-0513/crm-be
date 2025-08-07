import express from 'express';
import { get_activity_by_id } from '../controllers/activity-controller/get-activity-by-id';
import { get_paginated_activities } from '../controllers/activity-controller/get-paginated-activities';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.get('/activities/:contactId', authMiddleware, get_activity_by_id);
router.get('/activities', authMiddleware, get_paginated_activities);

export default router;

