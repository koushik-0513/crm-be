import { Request, Response } from "express";
import { z } from "zod";
import ChatMessage from "../../models/chat-Model";
const DEFAULT_MODEL = 'gpt-4o-mini';
import { stream_text_with_fallback, get_recommended_fallbacks } from "../../lib/ai-Providers";
import { TUserMessage, SenderType, TAIProvider, TAIGenerateTextOptions, TAIGenerateTextResponse, TAuthenticatedRequest } from '../../types';
import { get_crm_context, create_system_prompt } from "./utils";
import {  
  process_message_context,
  DEFAULT_TOKEN_CONFIG,
  estimate_messages_tokens,
  estimate_tokens
} from "../../lib/summarization-Utils";
import { TAppError } from "../../utils/throw-error";

export type TMessage = {
  sender: 'user' | 'ai';
  message: string;
  timestamp?: Date;
}

export type TCRMContext = {
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    company?: string;
    tags?: string[];
    note?: string;
    lastInteraction?: Date;
  }>;
  activities: Array<{
    activityType: string;
    details?: string;
    timestamp: Date;
    contactId?: string;
  }>;
  contactStats: {
    totalContacts: number;
    companiesCount: number;
    tagsCount: number;
  };
  topCompanies: { _id: string; count: number }[];
  tags: { name: string; color: string }[];
}

// Zod Schema for validation
const handle_chat_message_schema = z.object({
  body: z.object({
    message: z.string().min(1, "Message is required"),
    conversation_id: z.string().min(1, "Conversation ID is required"),
    modelName: z.string().optional(),
  }),
});

export const handle_chat_message = async (req: Request, res: Response): Promise<void> => {
  const validated_data = handle_chat_message_schema.parse(req);
  const { message, conversation_id, modelName = DEFAULT_MODEL } = validated_data.body;
  
  const auth_req = req as TAuthenticatedRequest;
  const user_id = auth_req.user.uid;

  const recent_user_messages = await ChatMessage.aggregate([
    { $match: { user: user_id } },
    { $unwind: '$messages' },
    { $match: { 'messages.sender': 'user' } },
    { $sort: { 'messages.timestamp': -1 } },
    { $limit: 5 },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]);

  const recent_count = recent_user_messages[0]?.count || 0;
  if (recent_count >= 5) {
    const last_message = await ChatMessage.aggregate([
      { $match: { user: user_id } },
      { $unwind: '$messages' },
      { $match: { 'messages.sender': 'user' } },
      { $sort: { 'messages.timestamp': -1 } },
      { $limit: 1 }
    ]);

    if (last_message.length > 0) {
      const last_message_time = new Date(last_message[0].messages.timestamp);
      const time_diff = Date.now() - last_message_time.getTime();
      
      if (time_diff < 10000) { // 10 seconds
        throw new TAppError("Please wait a moment before sending another message.", 429);
      }
    }
  }

  // Handle legacy model names
  const normalized_model_name = modelName === 'gemini-2.5-flash' ? 'gemini-2.5-flash' : modelName;

  // Check for required API keys
  const openai_key = process.env.OPENAI_API_KEY;
  const mistral_key = process.env.MISTRAL_API_KEY;
  
  if (!openai_key && !mistral_key) {
    throw new TAppError('No AI API keys configured. Please set OPENAI_API_KEY or MISTRAL_API_KEY', 500);
  }

  const crm_context = await get_crm_context(user_id);

  let conversation = await ChatMessage.findOne({ conversationId: conversation_id, user: user_id });

  if (!conversation) {
    conversation = await ChatMessage.create({
      conversationId: conversation_id,
      user: user_id,
      messages: [],
    });
  }

  // Set proper headers for streaming
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  // Add user message to conversation but don't save yet
  const user_msg: TMessage = {
    sender: SenderType.USER,
    message,
    timestamp: new Date(),
  };
  conversation.messages.push(user_msg);

  // Create AI provider for summarization if needed
  const ai_provider: TAIProvider = {
    generateText: async (options: TAIGenerateTextOptions): Promise<TAIGenerateTextResponse> => {
      const result = await stream_text_with_fallback({
        options: {
          modelName: normalized_model_name,
          messages: [{ role: 'user', content: options.prompt }],
          temperature: options.temperature || 0.3,
          maxTokens: options.maxTokens || 500,
        },
        fallbackModels: get_recommended_fallbacks(normalized_model_name)
      });
      
      if (!result.success || !result.textStream) {
        throw new Error(result.error || 'Failed to generate summary');
      }

      let text = '';
      for await (const chunk of result.textStream) {
        text += chunk;
      }
      
      return { text: text.trim() };
    }
  };

  // Check if we need summarization - use optimized context token count
  const all_messages = [...conversation.messages];
  const recent_message_count = conversation.summary ? 3 : 8;
  const recent_messages = all_messages.slice(-recent_message_count);
  
  // Calculate token count of optimized context (summary + recent messages)
  let context_tokens = 0;
  if (conversation.summary) {
    context_tokens += estimate_tokens(conversation.summary);
  }
  context_tokens += estimate_messages_tokens({ messages: recent_messages });
  
  // Proactive summarization: Check if the optimized context would exceed threshold
  if (context_tokens > DEFAULT_TOKEN_CONFIG.tokenThreshold) {
    
    // Keep the latest message unsummarized, summarize everything else
    const messages_to_summarize = all_messages.slice(0, -1);
    const latest_message = all_messages[all_messages.length - 1];
    
    if (messages_to_summarize.length > 0) {
      const summarized_context = await process_message_context({
        allMessages: messages_to_summarize, 
        config: DEFAULT_TOKEN_CONFIG, 
        aiProvider: ai_provider,
        existingSummary: conversation.summary // Pass existing summary for incremental summarization
      });
      
      // Update conversation with new summary but KEEP ALL MESSAGES
      conversation.summary = summarized_context.summary;
      conversation.summaryTokens = summarized_context.totalTokens;
      conversation.lastSummarizedAt = new Date();
      // DO NOT replace conversation.messages - keep all messages for UI
      
      // Save the updated conversation to database immediately
      await conversation.save();
    }
  }

  // Get the system prompt
  const system_prompt = create_system_prompt(crm_context);

  // Format messages for AI (system prompt + summary + recent messages)
  const formatted_messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: system_prompt },
  ];

  // Add summary if available
  if (conversation.summary) {
    formatted_messages.push({
      role: 'assistant',
      content: `[Previous conversation summary: ${conversation.summary}]`
    });
  }

  // Add recent messages - if we have a summary, only use the last few messages
  // If no summary, use more recent messages for context
  const final_recent_message_count = conversation.summary ? 3 : 8;
  const final_recent_messages = conversation.messages.slice(-final_recent_message_count);
  
  formatted_messages.push(
    ...final_recent_messages.map((msg: TMessage) => ({
      role: msg.sender === SenderType.USER ? 'user' : 'assistant',
      content: msg.message,
    }))
  );

  // Log the final context token count
  const context_text = formatted_messages.map(m => m.content).join('\n');
  const final_context_tokens = estimate_tokens(context_text);

  let complete_ai_message = '';
  let has_content = false;

  // Get fallback models for automatic fallback
  const fallback_models = get_recommended_fallbacks(normalized_model_name);
  
  const result = await stream_text_with_fallback({
    options: {
      modelName: normalized_model_name,
      messages: formatted_messages,
      temperature: 0.7,
      maxTokens: 1000,
    },
    fallbackModels: fallback_models
  });

  if (!result.success) {
    throw new Error(result.error || 'All AI models failed');
  }

  // Stream the response with better timing
  let chunk_count = 0;
  for await (const chunk of result.textStream!) {
    if (chunk && chunk.trim().length > 0) {
      has_content = true;
      complete_ai_message += chunk;
      res.write(chunk);
      chunk_count++;
      // Increased delay for better readability
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Validate that we got a response
  if (!has_content || !complete_ai_message || complete_ai_message.trim().length === 0) {
    throw new Error(`No response received from ${result.provider}/${result.model}`);
  }

  const ai_msg: TUserMessage = {
    sender: SenderType.AI,
    message: complete_ai_message.trim(),
    timestamp: new Date(),
    metadata: {
      model: normalized_model_name,
    },
  };

  // Add AI message to conversation
  conversation.messages.push(ai_msg);
  
  // Save both user and AI messages together
  await conversation.save();
  
  res.end();
}; 