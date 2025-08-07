import { Request, Response } from "express";
import { z } from "zod";
import Contact from "../../models/contact-Model";
import MessageHistory from "../../models/message-History-Model";
import { vectorSearchService } from "../../lib/vector-Search";
import { TContextResult, TAuthenticatedRequest } from '../../types';
import { get_ai_model, create_message_prompt, parse_message_versions } from "./utils";

export type TGenerateMessageRequest = {
  prompt: string;
  contactIds: string[];
  model?: string;
}

// Zod Schema for validation
const generate_message_schema = z.object({
  body: z.object({
    prompt: z.string().min(1, "Prompt is required"),
    contactIds: z.array(z.string()).min(1, "At least one contact ID is required"),
    model: z.string().optional(),
  }),
});

export const generate_message = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = generate_message_schema.parse(req);
    const { prompt, contactIds, model = 'gpt-4o-mini' } = validated_data.body;
    const authReq = req as TAuthenticatedRequest;
    
    const user_id = authReq.user.uid;

    const results = [];

    for (const contactId of contactIds) {
      try {
        // Get contact information
        const contact = await Contact.findOne({ _id: contactId, user: user_id });
        if (!contact) {
          results.push({
            contactId,
            message: "Contact not found",
          });
          continue;
        }

        // Get relevant context using RAG
        const context_results = await vectorSearchService.search_similar_content({
          userId: user_id,
          contactId,
          query: prompt,
          limit: 5
        });

        // Get previous messages
        const previous_messages = await MessageHistory.find({
          contactId,
          user: user_id,
        })
          .sort({ generatedAt: -1 })
          .limit(3);

        // Prepare context
        const context = context_results
          .map((result: TContextResult) => `${result.contentType}: ${result.content}`)
          .join('\n');

        const previous_messages_text = previous_messages
          .map(msg => `- ${msg.messageContent}`)
          .join('\n');

        // Create contact info string
        const contactInfo = `
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Tags: ${contact.tags?.join(', ') || 'None'}
Notes: ${contact.note || 'None'}
        `.trim();

        // Generate message using AI
        const aiModel = get_ai_model(model);
        const full_prompt = create_message_prompt({
          prompt,
          contactInfo,
          context,
          previousMessages: previous_messages_text
        });
        
        const start_time = Date.now();
        const ai_response = await aiModel.invoke(full_prompt);
        const generation_time = Date.now() - start_time;

        // Parse the response to extract versions
        const response_content = typeof ai_response.content === 'string' 
          ? ai_response.content 
          : JSON.stringify(ai_response.content);
        const versions = parse_message_versions(response_content);

        // Store each version in message history
        const stored_messages = [];
        for (const version of versions) {
          const message_history = await MessageHistory.create({
            user: user_id,
            contactId,
            contactName: contact.name,
            phoneNumber: contact.phone,
            messageContent: version,
            status: 'pending',
            prompt,
            metadata: {
              aiModel: model,
                contextUsed: context_results.map((r: TContextResult) => r.contentType),
              generationTime: generation_time,
            },
          });
          stored_messages.push(message_history);
        }

        results.push({
          contactId,
          contactName: contact.name,
          phoneNumber: contact.phone,
          messages: stored_messages,
          context: context_results,
        });

      } catch (error) {
        console.error(`Error generating message for contact ${contactId}:`, error);
        results.push({
          contactId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.json({
      message: "Messages generated successfully",
      data: { results }
    });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    console.error("Error generating messages:", error);
    res.status(500).json({
      error: "Failed to generate messages",
    });
  }
}; 