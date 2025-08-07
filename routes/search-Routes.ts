import express from 'express';
import { search_contacts } from '../controllers/search-controller/search';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.get('/search', authMiddleware, search_contacts);

export default router;