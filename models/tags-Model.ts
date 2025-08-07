import mongoose, { Schema, model, models, Document, Types } from "mongoose";
import { TUserTag } from "../types";

const tag_schema = new Schema<TUserTag>({
  name: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    default: "#3b82f6",
    required: true,
  },
  user: {
    type: String,
    ref: "User", 
    required: true,
  },
});

const Tag = models.Tag || model<TUserTag>("Tag", tag_schema);
export default Tag;
