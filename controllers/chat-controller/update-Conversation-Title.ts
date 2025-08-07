import { Request, Response } from 'express';
import { z } from 'zod';
import ChatMessage from '../../models/chat-Model';
import User from '../../models/user-Model';
import { TAuthenticatedRequest } from "../../types";
import { TAppError } from "../../utils/throw-error";

// Zod Schema for validation
const update_conversation_title_schema = z.object({
  params: z.object({
    conversationId: z.string().min(1, "Conversation ID is required"),
  }),
  body: z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  }),
});

export const update_conversation_title = async (req: Request, res: Response): Promise<void> => {
  // Validate request
  const validated_data = update_conversation_title_schema.parse(req);
  const { conversationId } = validated_data.params;
  const { title } = validated_data.body;
  
  const auth_req = req as TAuthenticatedRequest;
  const user_id = auth_req.user.uid;

  if (!user_id) {
    throw new TAppError('User not authenticated', 401);
  }

  // Find and update the conversation title
  const updated_conversation = await ChatMessage.findOneAndUpdate(
    {
      conversationId: conversationId,
      user: user_id
    },
    {
      title: title.trim(),
      updatedAt: new Date()
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updated_conversation) {
    throw new TAppError('Conversation not found', 404);
  }

  res.status(200).json({
    message: 'Conversation title updated successfully',
    title: updated_conversation.title
  });
}; 