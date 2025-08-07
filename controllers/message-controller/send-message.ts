import { Request, Response } from "express";
import { z } from "zod";
import Contact from "../../models/contact-Model";
import MessageHistory from "../../models/message-History-Model";
import { sms_service } from "../../lib/sms-Service";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, MessageStatus, TAuthenticatedRequest } from '../../types';

export type TSendMessageRequest = {
  messageContent: string;
  contactIds: string[];
  prompt: string;
}

// Zod Schema for validation
const send_message_schema = z.object({
  body: z.object({
    messageContent: z.string().min(1, "Message content is required"),
    contactIds: z.array(z.string()).min(1, "At least one contact ID is required"),
    prompt: z.string().min(1, "Prompt is required"),
  }),
});

export const send_message = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = send_message_schema.parse(req);
    const { messageContent, contactIds, prompt } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    const results = [];

    for (const contactId of contactIds) {
      try {
        // Get contact information
        const contact = await Contact.findOne({ _id: contactId, user: user_id });
        if (!contact) {
          results.push({
            contactId,
            success: false,
            error: "Contact not found",
          });
          continue;
        }

        // Validate phone number
        const is_valid_phone = await sms_service.validate_phone_number(contact.phone);
        if (!is_valid_phone) {
          results.push({
            contactId,
            success: false,
            error: "Invalid phone number",
          });
          continue;
        }

        // Send message via SMS
        const sms_result = await sms_service.send_message(
          contact.phone,
          messageContent
        );

        // Update message history
        await MessageHistory.findOneAndUpdate(
          {
            user: user_id,
            contactId,
            messageContent,
            status: MessageStatus.PENDING,
          },
          {
            status: MessageStatus.SENT,
            smsMessageId: sms_result.messageId,
            sentAt: new Date(),
          }
        );

        // Log activity
        await log_activity(
          user_id,
          ActivityTypes.CONTACT_EDITED,
          `Sent SMS message to ${contact.name}: ${messageContent.substring(0, 50)}...`,
          contactId
        );

        results.push({
          contactId,
          contactName: contact.name,
          phoneNumber: contact.phone,
          success: true,
          messageId: sms_result.messageId,
          status: sms_result.status,
        });

      } catch (error) {
        console.error(`Error sending message to contact ${contactId}:`, error);
        
        // Update message history with error
        await MessageHistory.findOneAndUpdate(
          {
            user: user_id,
            contactId,
            messageContent,
            status: MessageStatus.PENDING,
          },
          {
            status: MessageStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          }
        );

        results.push({
          contactId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    res.status(200).json({
      success: true,
      results,
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

    console.error("Error sending messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send messages",
    });
  }
}; 