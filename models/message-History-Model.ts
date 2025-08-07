import mongoose, { Document, Schema, model, models } from "mongoose";
import { TIMessageHistory, MessageStatus } from "../types";

const message_history_schema = new Schema<TIMessageHistory>({
  user: { type: String, required: true },
  contactId: { type: String, required: true },
  contactName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  messageContent: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.PENDING,
    required: true,
  },
  smsMessageId: { type: String },
  prompt: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  readAt: { type: Date },
  errorMessage: { type: String },
  metadata: {
    aiModel: { type: String },
    contextUsed: [{ type: String }],
    generationTime: { type: Number },
    tokenCount: { type: Number },
    inputTokens: { type: Number },
    outputTokens: { type: Number },
  },
});

// Index for efficient querying
message_history_schema.index({ user: 1, contactId: 1, generatedAt: -1 });
message_history_schema.index({ status: 1 });
message_history_schema.index({ smsMessageId: 1 });

const MessageHistory = models.MessageHistory || model<TIMessageHistory>("MessageHistory", message_history_schema);

export default MessageHistory;