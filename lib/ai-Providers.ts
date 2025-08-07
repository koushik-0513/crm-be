import { streamText, type CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { mistral } from '@ai-sdk/mistral';
import { TAIProvider, TAIProviderConfig, TAIStreamOptions, TAIStreamResult, TSummarizedContext, TTokenConfig, TUserMessage } from '../types';

// ============================================================================
// AI PROVIDER SPECIFIC TYPES
// ============================================================================

export type TStreamTextWithProviderParams = {
  modelName: string;
  options: TAIStreamOptions;
  provider: string;
}

export type TStreamTextWithFallbackParams = {
  options: TAIStreamOptions;
  fallbackModels?: string[];
}

export type TSummarizeMessagesParams = {
  messages: Array<TUserMessage>;
  config: TTokenConfig;
  aiProvider: TAIProvider;
}

export type TProcessMessageContextParams = {
  allMessages: Array<TUserMessage>;
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

// Provider configurations
export const AI_PROVIDERS: Record<string, TAIProviderConfig> = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o-mini'],
    priority: 1,
    enabled: true,
  },
  mistral: {
    name: 'Mistral',
    models: ['mistral-large-latest'],
    priority: 2,
    enabled: true,
  },
};

// Get the appropriate provider for a model
export function get_provider_for_model(modelName: string): string {
  for (const [provider, config] of Object.entries(AI_PROVIDERS)) {
    if (config.enabled && config.models.includes(modelName)) {
      return provider;
    }
  }
  throw new Error(`No provider found for model: ${modelName}`);
}

// Get fallback models for a given model
export function get_fallback_models(modelName: string): string[] {
  const primaryProvider = get_provider_for_model(modelName);
  const fallbacks: string[] = [];
  
  // Get models from other providers in priority order
  const sortedProviders = Object.entries(AI_PROVIDERS)
    .filter(([provider, config]) => config.enabled && provider !== primaryProvider)
    .sort(([, a], [, b]) => a.priority - b.priority);
  
  for (const [provider, config] of sortedProviders) {
    fallbacks.push(...config.models);
  }
  
  return fallbacks;
}

// Stream text with automatic fallback
export async function stream_text_with_fallback(
  { options, fallbackModels = [] }: TStreamTextWithFallbackParams
): Promise<TAIStreamResult> {
  const all_models = [options.modelName, ...fallbackModels];
  
  for (const model of all_models) {
    try {
      const provider = get_provider_for_model(model);
      
      // Check if provider is enabled
      if (!AI_PROVIDERS[provider]?.enabled) {
        continue;
      }
      
      const result = await stream_text_with_provider({ modelName: model, options, provider });
      
      if (result.success) {
        return {
          ...result,
          provider,
          model,
        };
      } else {
        if (result.error?.includes('empty response')) {
          mark_provider_failure(provider);
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return {
    success: false,
    error: `All models failed: ${all_models.join(', ')}`,
  };
}

// Stream text with a specific provider
async function stream_text_with_provider(
  params: TStreamTextWithProviderParams
): Promise<TAIStreamResult> {
  const { modelName, options, provider } = params;
  
  try {
    let model;
    
    // Check if API keys are configured
    const openai_key = process.env.OPENAI_API_KEY;  
    const mistral_key = process.env.MISTRAL_API_KEY;
    
    switch (provider) {
      case 'openai':
        if (!openai_key) {
          throw new Error('OpenAI API key not configured');
        }
        model = openai(modelName);
        break;
      case 'mistral':
        if (!mistral_key) {
          throw new Error('Mistral API key not configured');
        }
        model = mistral(modelName);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Add timeout for API calls
    const timeout_promise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });
    
    const stream_promise = streamText({
      model,
      messages: options.messages as CoreMessage[],
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
    });

    const result = await Promise.race([stream_promise, timeout_promise]);
    
    return {
      success: true,
      textStream: result.textStream,
    };
  } catch (error) {
    let error_message = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types
    if (error_message.includes('quota') || error_message.includes('RESOURCE_EXHAUSTED') || error_message.includes('rate_limit')) {
      error_message = `${provider} API quota exceeded. Please check your billing and rate limits.`;
      disable_provider(provider);
    } else if (error_message.includes('API key')) {
      error_message = `${provider} API key is invalid or not configured properly.`;
    } else if (error_message.includes('permission')) {
      error_message = `${provider} API key does not have the necessary permissions.`;
    }
    
    return {
      success: false,
      error: error_message,
    };
  }
}

// Get recommended fallback models based on the primary model
export function get_recommended_fallbacks(primaryModel: string): string[] {
  const provider = get_provider_for_model(primaryModel);
  
  switch (provider) {
    case 'openai':
      return ['mistral-large-latest'];
    case 'mistral':
      return ['gpt-4o-mini'];
    default:
      return ['gpt-4o-mini', 'mistral-large-latest'];
  }
}

// Check if a model is available
export function is_model_available(modelName: string): boolean {
  try {
    get_provider_for_model(modelName);
    return true;
  } catch {
    return false;
  }
}

// Get all available models
export function get_all_available_models(): string[] {
  const models: string[] = [];
  for (const [provider, config] of Object.entries(AI_PROVIDERS)) {
    if (config.enabled) {
      models.push(...config.models);
    }
  }
  return models;
}

// Disable a provider
export function disable_provider(providerName: string): void {
  if (AI_PROVIDERS[providerName]) {
    AI_PROVIDERS[providerName].enabled = false;
  }
}

// Enable a provider
export function enable_provider(providerName: string): void {
  if (AI_PROVIDERS[providerName]) {
    AI_PROVIDERS[providerName].enabled = true;
  }
}

// Track provider failures
const provider_failures = new Map<string, number>();

// Mark a provider as failed
export function mark_provider_failure(providerName: string): void {
  const current_failures = provider_failures.get(providerName) || 0;
  provider_failures.set(providerName, current_failures + 1);
  
  // Disable provider after 3 consecutive failures
  if (current_failures + 1 >= 3) {
    disable_provider(providerName);
  }
}

// Reset provider failures
export function reset_provider_failures(providerName: string): void {
  provider_failures.delete(providerName);
} 