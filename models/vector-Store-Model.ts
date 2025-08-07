import mongoose, { Document, Schema, model, models } from "mongoose";
import { TIVectorStore, ContentType } from "../types";

const vector_store_schema = new Schema<TIVectorStore>({
  user: { type: String, required: true },
  contactId: { type: String, required: true },
  contentType: {
    type: String,
    enum: Object.values(ContentType),
    required: true,
  },
  content: { type: String, required: true },
  embedding: [{ type: Number, required: true }],
  metadata: {
    source: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tags: [{ type: String }],
    importance: { type: Number, default: 1.0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Index for vector search
vector_store_schema.index({ user: 1, contactId: 1 });
vector_store_schema.index({ contentType: 1 });
vector_store_schema.index({ "metadata.tags": 1 });

const VectorStore = models.VectorStore || model<TIVectorStore>("VectorStore", vector_store_schema);

export default VectorStore;