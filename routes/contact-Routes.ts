import express from "express";
import { create_contact } from "../controllers/contact-controller/create-contact";
import { get_all_contacts } from "../controllers/contact-controller/get-all-contacts";
import { get_contact_by_id } from "../controllers/contact-controller/get_contact_by_id";
import { update_contact } from "../controllers/contact-controller/update-contact";
import { delete_contact } from "../controllers/contact-controller/delete-contact";
import { delete_multiple_contacts } from "../controllers/contact-controller/delete_multiple_contacts";
import { import_contacts } from "../controllers/contact-controller/import-contacts";
import authMiddleware from "../middlewares/auth-Middleware";

const router = express.Router();

router.post("/contacts", authMiddleware, create_contact);
router.get("/contacts", authMiddleware, get_all_contacts);
router.get("/contacts/:id", authMiddleware, get_contact_by_id);
router.delete("/contacts/:id", authMiddleware, delete_contact);
router.put("/contacts/:id", authMiddleware, update_contact);
router.delete("/contacts", authMiddleware, delete_multiple_contacts);
router.post("/contacts/import", authMiddleware, import_contacts);

export default router;
