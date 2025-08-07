import { Request, Response } from 'express';
import { z } from 'zod';
import ChatMessage from '../../models/chat-Model';
import { TAuthenticatedRequest } from "../../types";
import { TAppError } from "../../utils/throw-error";

const get_conversation_schema = z.object({
  params: z.object({
    conversationId: z.string().min(1, "Conversation ID is required"),
  }),
});

export const get_conversation = async (req: Request, res: Response) => {
  const validated_data = get_conversation_schema.parse(req);
  const { conversationId } = validated_data.params;
  
  const auth_req = req as TAuthenticatedRequest;
  const user_id = auth_req.user.uid;

  if (!user_id) {
    throw new TAppError('User not authenticated', 401);
  }

  const conversation = await ChatMessage.findOne({
    conversationId: conversationId,
    user: user_id
  });

  if (!conversation) {
    throw new TAppError('Conversation not found', 404);
  }

  res.status(200).json({
    message: 'Conversation retrieved successfully',
    conversation
  });
}; 