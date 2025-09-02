import mongoose, { Document, Schema, model, models } from "mongoose";

export enum NotificationType {
  ADMIN_MESSAGE = "admin_message",
  SYSTEM_NOTIFICATION = "system_notification",
  CONTACT_UPDATE = "contact_update",
  ACTIVITY_REMINDER = "activity_reminder",
  TEAM_INVITE = "team_invite",
  GENERAL = "general",
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export type TNotification = Document & {
  recipient_uid: string;
  sender_uid?: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  priority: NotificationPriority;
  metadata?: {
    relatedId?: string;
    relatedType?: string;
    actionUrl?: string;
    expiresAt?: Date;
  };
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

const notification_schema = new Schema<TNotification>(
  {
    recipient_uid: {
      type: String,
      required: true,
      ref: "User",
    },
    sender_uid: {
      type: String,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.GENERAL,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    metadata: {
      relatedId: String,
      relatedType: String,
      actionUrl: String,
      expiresAt: Date,
    },
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

const Notification = models.Notification || model<TNotification>("Notification", notification_schema);

export default Notification;
