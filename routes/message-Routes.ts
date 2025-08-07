import express from 'express';
import { generate_message } from '../controllers/message-controller/generate-message';
import { send_message } from '../controllers/message-controller/send-message';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.post('/generate', authMiddleware, generate_message);
router.post('/send', authMiddleware, send_message);

export default router;