import { Request, Response } from 'express';
import { z } from "zod";
import ChatMessage from "../../models/chat-Model";
import { TAuthenticatedRequest } from "../../types";
import { TAppError } from "../../utils/throw-error";

export const get_chat_history = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as TAuthenticatedRequest;
  if (!authReq.user) {
    throw new TAppError("User not authenticated", 401);
  }
  
  const user_id = authReq.user.uid;
  
  const conversations = await ChatMessage.find({ user: user_id }).sort({ updatedAt: -1 });
  
  const conversations_with_context = conversations.map(conv => ({
    ...conv.toObject(),
    hasCRMContext: true,
  }));

  res.json({
    message: "Chat history fetched successfully",
    data: { conversations: conversations_with_context }
  });
}; 