import { Request, Response } from "express";
import { z } from "zod";
import { TAuthenticatedRequest, NotificationType, NotificationPriority } from "../../types";
import Notification from "../../models/notification-Model";
import User from "../../models/user-Model";
import { is_team_admin, is_team_member } from "../../utils/team-utils";

// Zod Schema for validation
const send_notification_schema = z.object({
  body: z.object({
    recipient_uid: z.string().min(1, "Recipient UID is required"),
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    message: z.string().min(1, "Message is required").max(500, "Message too long"),
    type: z.nativeEnum(NotificationType).default(NotificationType.GENERAL),
    priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.MEDIUM),
    metadata: z.object({
      relatedId: z.string().optional(),
      relatedType: z.string().optional(),
      actionUrl: z.string().url().optional(),
      expiresAt: z.string().datetime().optional(),
    }).optional(),
  }),
});

export const send_notification = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast to authenticated request after middleware
    const auth_req = req as TAuthenticatedRequest;
    
    // Validate request
    const validated_data = send_notification_schema.parse(req);
    const { recipient_uid, title, message, type, priority, metadata } = validated_data.body;
    const sender_uid = auth_req.user.uid;

    // Check if sender has permission to send notifications
    const sender = await User.findOne({ uid: sender_uid });
    if (!sender) {
      res.status(404).json({ success: false, error: "Sender not found" });
      return;
    }

    // Check if recipient exists
    const recipient = await User.findOne({ uid: recipient_uid });
    if (!recipient) {
      res.status(404).json({ success: false, error: "Recipient not found" });
      return;
    }

    // Permission checks based on notification type
    if (type === NotificationType.ADMIN_MESSAGE) {
      // Only admins can send admin messages
      if (sender.role !== "admin") {
        res.status(403).json({ success: false, error: "Only admins can send admin messages" });
        return;
      }

      // Check if sender is admin of recipient's team
      if (recipient.team && sender.team) {
        const is_admin = await is_team_admin(recipient.team.toString(), sender_uid);
        if (!is_admin) {
          res.status(403).json({ success: false, error: "You can only send admin messages to your team members" });
          return;
        }
      }
    }

    // Create notification
    const notification = new Notification({
      recipient_uid,
      sender_uid,
      title,
      message,
      type,
      priority,
      metadata: metadata ? {
        ...metadata,
        expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
      } : undefined,
    });

    await notification.save();

    // Populate sender info for response
    await notification.populate("sender_uid", "name email photoUrl");

    res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        success: false,
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Send notification error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to send notification" 
    });
  }
};
