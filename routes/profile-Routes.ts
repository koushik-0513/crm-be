import express from 'express';
import { get_profile } from '../controllers/user-controller/get-Profile';
import { update_profile } from '../controllers/user-controller/update-Profile';
import { delete_user } from '../controllers/user-controller/delete-User';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.get('/profile', authMiddleware, get_profile);
router.put('/profile', authMiddleware, update_profile);
router.delete('/profile', authMiddleware, delete_user);

export default router;