import express from 'express';
import { create_tag } from '../controllers/tag-controller/create-tag';
import { get_all_tags } from '../controllers/tag-controller/get-all-tags';
import { edit_tag } from '../controllers/tag-controller/edit-tag';
import { delete_tag } from '../controllers/tag-controller/delete-tag';
import { bulk_add_tags } from '../controllers/tag-controller/bulk-add-tags';
import authMiddleware from '../middlewares/auth-Middleware';

const router = express.Router();

router.post('/tags', authMiddleware, create_tag);
router.get('/tags', authMiddleware, get_all_tags);
router.put('/tags/:id', authMiddleware, edit_tag);
router.delete('/tags/:id', authMiddleware, delete_tag);
router.post('/tags/bulk-add', authMiddleware, bulk_add_tags);

export default router;
