import { Request, Response } from "express";
import { TAuthenticatedRequest } from "../../types";
import Notification from "../../models/notification-Model";

export const mark_notification_read = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast to authenticated request after middleware
    const auth_req = req as TAuthenticatedRequest;
    const user_uid = auth_req.user.uid;
    const notification_id = req.params.id;

    if (!notification_id) {
      res.status(400).json({ success: false, error: "Notification ID is required" });
      return;
    }

    // Find notification and verify ownership
    const notification = await Notification.findOne({
      _id: notification_id,
      recipient_uid: user_uid,
    });

    if (!notification) {
      res.status(404).json({ success: false, error: "Notification not found" });
      return;
    }

    // Mark as read
    notification.status = "read";
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Mark notification read error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to mark notification as read" 
    });
  }
};
