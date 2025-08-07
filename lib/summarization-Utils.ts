import { TUserMessage, TSummarizedContext, TTokenConfig, TAIProvider } from '../types';

// ============================================================================
// SUMMARIZATION UTILS SPECIFIC TYPES
// ============================================================================

export type TSummarizeMessagesParams = {
  messages: TUserMessage[];
  config: TTokenConfig;
  aiProvider: TAIProvider;
}

export type TProcessMessageContextParams = {
  allMessages: TUserMessage[];
  config?: TTokenConfig;
  aiProvider?: TAIProvider;
  existingSummary?: string;
}

export type TUpdateContextWithNewMessageParams = {
  currentContext: TSummarizedContext;
  newMessage: TUserMessage;
  config?: TTokenConfig;
  aiProvider?: TAIProvider;
}

export type TNeedsFurtherSummarizationParams = {
  context: TSummarizedContext;
  newMessage: TUserMessage;
  config?: TTokenConfig;
}

// Default token configuration
export const DEFAULT_TOKEN_CONFIG: TTokenConfig = {
  tokenThreshold: 4000, // 4k tokens for context
  maxTokens: 1000, // 1k tokens for response
  summaryPrompt: `Summarize the following conversation in a concise way that captures the key points, decisions, and context that would be useful for future interactions. Focus on:
- Main topics discussed
- Key decisions or agreements made
- Important context or background information
- Any action items or follow-ups needed

Conversation:
`,
};

// Estimate token count for text (rough approximation)
export const estimate_tokens = (text: string): number => {
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Estimate token count for a single message
export const estimate_message_tokens = (message: TUserMessage): number => {
  const messageText = `${message.sender}: ${message.message}`;
  return estimate_tokens(messageText);
};

// Estimate token count for multiple messages
export const estimate_messages_tokens = ({ messages }: { messages: TUserMessage[] }): number => {
  return messages.reduce((total, message) => total + estimate_message_tokens(message), 0);
};

// Create summary prompt
export const create_summary_prompt = ({ messages, config }: { messages: TUserMessage[]; config: TTokenConfig }): string => {
  const conversationText = messages
    .map(msg => `${msg.sender}: ${msg.message}`)
    .join('\n');
  
  return `${config.summaryPrompt}${conversationText}`;
};

// Summarize messages using AI
export const summarize_messages = async (
  params: TSummarizeMessagesParams
): Promise<string> => {
  const { messages, config, aiProvider } = params;
  
  if (messages.length === 0) return '';

  try {
    const summaryPrompt = create_summary_prompt({ messages, config });
    
    // Use the AI provider to generate summary
    const summaryResponse = await aiProvider.generateText({
      prompt: summaryPrompt,
      maxTokens: 500, // Limit summary length
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    return summaryResponse.text || 'Conversation history available.';
  } catch (error) {
    console.error('Error generating summary:', error);
    // Fallback: create a basic summary
    return `Previous conversation with ${messages.length} messages. Key topics discussed.`;
  }
};

// Process messages and create optimized context
export const process_message_context = async (
  params: TProcessMessageContextParams
): Promise<TSummarizedContext> => {
  const { allMessages, config = DEFAULT_TOKEN_CONFIG, aiProvider, existingSummary } = params;
  
  if (allMessages.length === 0) {
    return { summary: existingSummary || '', messages: [], totalTokens: estimate_tokens(existingSummary || '') };
  }

  let summary = existingSummary || '';
  let totalTokens = estimate_messages_tokens({ messages: allMessages });

  // If we're under the threshold, no summarization needed
  if (totalTokens <= config.tokenThreshold) {
    return { summary, messages: allMessages, totalTokens };
  }

  // We need to summarize. Keep the latest message unsummarized
  const messagesToSummarize = allMessages.slice(0, -1);
  const latestMessage = allMessages[allMessages.length - 1];

  if (messagesToSummarize.length === 0) {
    // Only one message, can't summarize - keep it unsummarized
    return { summary, messages: [latestMessage], totalTokens: estimate_message_tokens(latestMessage) };
  }

  // Generate summary of all messages except the latest
  if (aiProvider) {
    // If we have an existing summary, include it in the summarization prompt
    let summaryPrompt = config.summaryPrompt;
    if (existingSummary) {
      summaryPrompt += `\n\nNote: There is already a previous summary: "${existingSummary}". Please create a new comprehensive summary that incorporates both the previous summary and the new conversation content.`;
    }
    
    summary = await summarize_messages({ messages: messagesToSummarize, config: { ...config, summaryPrompt }, aiProvider });
  } else {
    // Fallback summary
    if (existingSummary) {
      summary = `${existingSummary} + Previous conversation with ${messagesToSummarize.length} additional messages. Key topics discussed.`;
    } else {
      summary = `Previous conversation with ${messagesToSummarize.length} messages. Key topics discussed.`;
    }
  }

  // Calculate new token count
  const summaryTokens = estimate_tokens(summary);
  const latestMessageTokens = estimate_message_tokens(latestMessage);
  totalTokens = summaryTokens + latestMessageTokens;

  return {
    summary,
    messages: [latestMessage], // Only the latest message remains unsummarized
    totalTokens
  };
};

// Check if context needs further summarization
export const needs_further_summarization = (
  params: TNeedsFurtherSummarizationParams
): boolean => {
  const { context, newMessage, config = DEFAULT_TOKEN_CONFIG } = params;
  const newMessageTokens = estimate_message_tokens(newMessage);
  const totalTokens = context.totalTokens + newMessageTokens;
  return totalTokens > config.tokenThreshold;
};

// Update context with a new message
export const update_context_with_new_message = async (
  params: TUpdateContextWithNewMessageParams
): Promise<TSummarizedContext> => {
  const { currentContext, newMessage, config = DEFAULT_TOKEN_CONFIG, aiProvider } = params;
  const newMessageTokens = estimate_message_tokens(newMessage);
  const totalTokens = currentContext.totalTokens + newMessageTokens;

  // If we're still under the threshold, just add the message
  if (totalTokens <= config.tokenThreshold) {
    return {
      summary: currentContext.summary,
      messages: [...currentContext.messages, newMessage],
      totalTokens
    };
  }

  // We need to summarize. Add the new message to the summarization
  const allMessages = [...currentContext.messages, newMessage];
  
  // Keep the latest message unsummarized
  const messagesToSummarize = allMessages.slice(0, -1);
  const latestMessage = allMessages[allMessages.length - 1];

  if (messagesToSummarize.length === 0) {
    // Only one message, can't summarize
    return {
      summary: currentContext.summary,
      messages: [latestMessage],
      totalTokens: estimate_message_tokens(latestMessage)
    };
  }

  // Generate new summary
  let newSummary = currentContext.summary;
  if (aiProvider) {
    newSummary = await summarize_messages({ messages: messagesToSummarize, config, aiProvider });
  } else {
    // Fallback summary
    newSummary = `Previous conversation with ${messagesToSummarize.length} messages. Key topics discussed.`;
  }

  // Calculate new token count
  const summaryTokens = estimate_tokens(newSummary);
  const latestMessageTokens = estimate_message_tokens(latestMessage);
  const newTotalTokens = summaryTokens + latestMessageTokens;

  return {
    summary: newSummary,
    messages: [latestMessage],
    totalTokens: newTotalTokens
  };
}; 