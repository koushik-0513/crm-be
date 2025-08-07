import mongoose, { Document, Schema, model, models } from "mongoose";
import { TUser } from "../types";

const user_schema = new Schema<TUser>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    photoUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<TUser>("User", user_schema);

export default User;

