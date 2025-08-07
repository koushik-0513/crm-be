import mongoose, { Schema, model, models, Document } from "mongoose";
import { TUserContact } from "../types";


const contact_schema = new Schema<TUserContact>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
    },
    user: {
      type: String, 
      required: true,
    },
    lastInteraction: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, 
  }
);

const Contact = models.Contact || model<TUserContact>("Contact", contact_schema);

export default Contact;
