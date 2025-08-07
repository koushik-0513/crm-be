import { Request, Response } from "express";
import { z } from "zod";
import ChatMessage from "../../models/chat-Model";
import { TAuthenticatedRequest } from "../../types";
import { TAppError } from "../../utils/throw-error";


const delete_conversation_schema = z.object({
  params: z.object({
    conversationId: z.string().min(1, "Conversation ID is required"),
  }),
});

export const delete_conversation = async (req: Request, res: Response): Promise<void> => {
  const validated_data = delete_conversation_schema.parse(req);
  const { conversationId } = validated_data.params;
  
  const auth_req = req as TAuthenticatedRequest;
  const user_id = auth_req.user.uid;

  const result = await ChatMessage.deleteOne({ conversationId: conversationId, user: user_id });

  if (result.deletedCount === 0) {
    throw new TAppError("Conversation not found", 404);
  }

  res.json({ message: "Conversation deleted successfully" });
}; 