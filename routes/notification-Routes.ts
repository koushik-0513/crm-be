import express from "express";
import { get_user_notifications } from "../controllers/notification-controller/get-user-notifications";
import { send_notification } from "../controllers/notification-controller/send-notification";
import { mark_notification_read } from "../controllers/notification-controller/mark-notification-read";
import { get_all_users } from "../controllers/notification-controller/get-all-users";
import auth_middleware from "../middlewares/auth-Middleware";

const router = express.Router();

// All notification routes require authentication
router.use(auth_middleware);

// Get user's notifications
router.get("/notifications", get_user_notifications);

// Send notification
router.post("/notifications/send", send_notification);

// Mark notification as read
router.patch("/notifications/:id/read", mark_notification_read);

// Get all users (for notification recipients)
router.get("/users", get_all_users);

export default router;
