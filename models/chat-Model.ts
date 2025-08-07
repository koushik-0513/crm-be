
import { Schema, model, models, Document } from "mongoose";
import { TUserMessage, TUserChatMessage, SenderType } from "../types";

const message_schema = new Schema<TUserMessage>(
  {
    sender: {
      type: String,
      enum: Object.values(SenderType),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      tokenCount: { type: Number },
      inputTokens: { type: Number },
      outputTokens: { type: Number },
      model: { type: String },
    },
  },
  { _id: false } 
);

const chat_schema = new Schema<TUserChatMessage>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: () => `Chat - ${new Date().toLocaleDateString()}`,
    },
    messages: [message_schema],
    // Summarization context fields
    summary: {
      type: String,
      default: '',
    },
    summaryTokens: {
      type: Number,
      default: 0,
    },
    lastSummarizedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);

chat_schema.index({ user: 1, conversationId: 1 });

const ChatMessage =
  models.ChatMessage || model<TUserChatMessage>("ChatMessage", chat_schema);

export default ChatMessage;
