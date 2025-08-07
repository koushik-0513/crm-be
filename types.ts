import { Request } from 'express';
import { Document } from 'mongoose';


export enum ActivityTypes {
  CONTACT_CREATED = "CONTACT CREATED",
  CONTACT_DELETED = "CONTACT DELETED",
  CONTACT_EDITED = "CONTACT EDITED",
  TAG_CREATED = "TAG CREATED",
  TAG_EDITED = "TAG EDITED",
  TAG_DELETED = "TAG DELETED",
  BULK_IMPORT_CONTACTS = "BULK IMPORT CONTACTS",
  BULK_DELETE_CONTACTS = "BULK DELETE CONTACTS",
  FORCE_DELETE_TAG = "FORCE DELETE TAG",
  ACCOUNT_DELETED = "ACCOUNT DELETED"
}

export enum SenderType {
  USER = "user",
  AI = "ai",
}

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed"
}

export enum ContentType {
  ACTIVITY = "activity",
  NOTE = "note",
  MESSAGE_HISTORY = "message_history",
  MEETING_NOTE = "meeting_note",
  PREFERENCE = "preference"
}



export type TUser = Document & {
  uid: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TUserContact = Document & {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  note?: string;
  user: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastInteraction?: Date;
}

export type TUserTag = Document & {
  name: string;
  color: string;
  user: string;
}

export type TIActivity = Document & {
  contactId?: string;
  user: string;
  activityType: ActivityTypes;
  timestamp: Date;
  details?: string;
}

export type TUserMessage = {
  sender: SenderType;
  message: string;
  timestamp?: Date;
  metadata?: {
    model?: string;
  };
}

export type TUserChatMessage = Document & {
  conversationId: string;
  user: string;
  title?: string;
  messages: TUserMessage[];
  // Summarization context fields
  summary?: string;
  summaryTokens?: number;
  lastSummarizedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TIMessageHistory = Document & {
  user: string;
  contactId: string;
  contactName: string;
  phoneNumber: string;
  messageContent: string;
  status: MessageStatus;
  smsMessageId?: string;
  prompt: string;
  generatedAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  metadata?: {
    aiModel: string;
    contextUsed: string[];
    generationTime: number;
  };
}

export type TIVectorStore = Document & {
  user: string;
  contactId: string;
  contentType: ContentType;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
    importance?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}


export type TAIProviderConfig = {
  name: string;
  models: string[];
  priority: number; // Lower number = higher priority
  enabled: boolean;
}

export type TAIStreamOptions = {
  modelName: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export type TAIStreamResult = {
  success: boolean;
  textStream?: AsyncIterable<string>;
  error?: string;
  provider?: string;
  model?: string;
}

export type TAIGenerateTextOptions = {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export type TAIGenerateTextResponse = {
  text: string;
}

export type TAIProvider = {
  generateText: (options: TAIGenerateTextOptions) => Promise<TAIGenerateTextResponse>;
}


export type TSummarizedContext = {
  summary: string;
  messages: TUserMessage[];
  totalTokens: number;
}

export type TTokenConfig = {
  tokenThreshold: number;
  maxTokens: number;
  summaryPrompt: string;
}


export type TSearchResult = {
  content: string;
  contentType: ContentType;
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
    importance?: number;
  };
  similarity: number;
}

export type TContextResult = {
  content: string;
  contentType: ContentType;
  metadata: {
    source: string;
    timestamp: Date;
    tags?: string[];
    importance?: number;
  };
  similarity: number;
}


export type TSMSMessage = {
  to: string;
  text: string;
}

export type TSMSResponse = {
  response: {
    status: string;
    id?: string;
  };
}


export type TAuthenticatedRequest = Request & {
  user: {
    uid: string;
  };
}



export type TFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} 