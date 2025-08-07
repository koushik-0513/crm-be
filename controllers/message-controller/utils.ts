import { ChatOpenAI } from "@langchain/openai";
import { vectorSearchService } from "../../lib/vector-Search";
import Contact from "../../models/contact-Model";
import MessageHistory from "../../models/message-History-Model";
import { MessageStatus } from "../../types";

// AI model for message generation
export const get_ai_model = (modelName: string = 'gpt-4o-mini') => {
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName,
    temperature: 0.7,
    maxTokens: 500,
  });
};

// Prompt template for message generation
export const create_message_prompt = ({
  prompt,
  contactInfo,
  context,
  previousMessages
}: {
  prompt: string;
  contactInfo: string;
  context: string;
  previousMessages: string;
}): string => {
  return `You are a professional SMS message generator for a CRM system. Generate personalized, friendly, and professional SMS messages.

CONTACT INFORMATION:
${contactInfo}

USER PROMPT:
${prompt}

RELEVANT CONTEXT (from previous interactions, notes, activities):
${context}

PREVIOUS MESSAGES (for context):
${previousMessages}

INSTRUCTIONS:
- Generate 3 different versions of the message
- Keep messages concise (under 200 characters)
- Use a friendly, professional tone
- Personalize based on contact information and context
- Include relevant details from the context
- Make it sound natural and conversational
- Avoid generic messages - be specific to the contact and situation

FORMAT YOUR RESPONSE AS:
Version 1: [message]
Version 2: [message]
Version 3: [message]

Generate the 3 message versions:`;
};

// Helper function to parse AI response into message versions
export const parse_message_versions = (ai_response: string): string[] => {
  const versions: string[] = [];
  const lines = ai_response.split('\n');
  
  for (const line of lines) {
    const match = line.match(/Version \d+:\s*(.+)/i);
    if (match) {
      versions.push(match[1].trim());
    }
  }
  
  // If parsing fails, return the entire response as one version
  if (versions.length === 0) {
    return [ai_response.trim()];
  }
  
  return versions.slice(0, 3); // Return max 3 versions
}; 