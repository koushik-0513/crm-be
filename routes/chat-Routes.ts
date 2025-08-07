import express from 'express';
import { handle_chat_message } from '../controllers/chat-controller/handle-Chat-Message';
import { get_chat_history } from '../controllers/chat-controller/get-Chat-History';
import { get_conversation } from '../controllers/chat-controller/get-Conversation';
import { delete_conversation } from '../controllers/chat-controller/delete-Conversation';
import { update_conversation_title } from '../controllers/chat-controller/update-Conversation-Title';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.post('/chat/send', authMiddleware, handle_chat_message);
router.get('/chat/history', authMiddleware, get_chat_history);
router.get('/chat/conversation/:conversationId', authMiddleware, get_conversation);
router.delete('/chat/conversation/:conversationId', authMiddleware, delete_conversation);
router.put('/chat/conversation/:conversationId/title', authMiddleware, update_conversation_title);

export default router;      