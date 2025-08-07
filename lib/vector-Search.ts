import { OpenAIEmbeddings } from '@langchain/openai';
import VectorStore from '../models/vector-Store-Model';
import Contact from '../models/contact-Model';
import Activity from '../models/activity-Model';
import MessageHistory from '../models/message-History-Model';
import { TSearchResult, ContentType } from '../types';

// ============================================================================
// VECTOR SEARCH SPECIFIC TYPES
// ============================================================================

export type TStoreContentParams = {
  userId: string;
  contactId: string;
  contentType: ContentType;
  content: string;
  metadata: {
    source: string;
    tags?: string[];
    importance?: number;
  };
}

export type TSearchSimilarContentParams = {
  userId: string;
  contactId: string;
  query: string;
  limit?: number;
}

export type TIndexContactDataParams = {
  userId: string;
  contactId: string;
}

export type TCosineSimilarityParams = {
  vecA: number[];
  vecB: number[];
}

export class VectorSearchService {
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Generate embedding for text
  async generate_embedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding as number[];
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Store content with embedding
  async store_content(params: TStoreContentParams): Promise<void> {
    const { userId, contactId, contentType, content, metadata } = params;
    
    try {
      const embedding = await this.generate_embedding(content);
      
      await VectorStore.create({
        user: userId,
        contactId,
        contentType,
        content,
        embedding,
        metadata: {
          ...metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error storing content:', error);
      throw new Error('Failed to store content');
    }
  }

  // Search for similar content
  async search_similar_content(params: TSearchSimilarContentParams): Promise<TSearchResult[]> {
    const { userId, contactId, query, limit = 5 } = params;
    
    try {
      const query_embedding = await this.generate_embedding(query);
      
      // Get all stored content for this contact
      const stored_content = await VectorStore.find({
        user: userId,
        contactId,
      }).lean();

      if (stored_content.length === 0) {
        return [];
      }

      // Calculate cosine similarity
      const results: TSearchResult[] = [];
      
      for (const item of stored_content) {
        const similarity = this.cosine_similarity({ vecA: query_embedding, vecB: item.embedding });
        results.push({
          content: item.content,
          contentType: item.contentType,
          metadata: item.metadata,
          similarity,
        });
      }

      // Sort by similarity and return top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching similar content:', error);
      throw new Error('Failed to search similar content');
    }
  }

  // Calculate cosine similarity between two vectors
  private cosine_similarity(params: TCosineSimilarityParams): number {
    const { vecA, vecB } = params;
    
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dot_product = 0;
    let norm_a = 0;
    let norm_b = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot_product += vecA[i] * vecB[i];
      norm_a += vecA[i] * vecA[i];
      norm_b += vecB[i] * vecB[i];
    }

    norm_a = Math.sqrt(norm_a);
    norm_b = Math.sqrt(norm_b);

    if (norm_a === 0 || norm_b === 0) {
      return 0;
    }

    return dot_product / (norm_a * norm_b);
  }

  // Index existing contact data
  async index_contact_data(params: TIndexContactDataParams): Promise<void> {
    const { userId, contactId } = params;
    
    try {
      // Get contact information
      const contact = await Contact.findOne({ _id: contactId, user: userId });
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Index contact notes
      if (contact.note) {
        await this.store_content({
          userId,
          contactId,
          contentType: ContentType.NOTE,
          content: contact.note,
          metadata: {
            source: 'contact_note',
            tags: contact.tags,
          },
        });
      }

      // Index activities
      const activities = await Activity.find({ contactId, user: userId })
        .sort({ timestamp: -1 })
        .limit(10);

      for (const activity of activities) {
        await this.store_content({
          userId,
          contactId,
          contentType: ContentType.ACTIVITY,
          content: `${activity.activityType}: ${activity.details}`,
          metadata: {
            source: 'activity_log',
            tags: [activity.activityType],
          },
        });
      }

      // Index message history
      const messages = await MessageHistory.find({ contactId, user: userId })
        .sort({ generatedAt: -1 })
        .limit(10);

      for (const message of messages) {
        await this.store_content({
          userId,
          contactId,
          contentType: ContentType.MESSAGE_HISTORY,
          content: `Previous message: ${message.messageContent}`,
          metadata: {
            source: 'message_history',
            tags: [message.status],
          },
        });
      }

    } catch (error) {
      console.error('Error indexing contact data:', error);
      throw new Error('Failed to index contact data');
    }
  }
}

export const vectorSearchService = new VectorSearchService();