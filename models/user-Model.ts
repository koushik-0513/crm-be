import mongoose, { Document, Schema, model, models } from "mongoose";
import { TUser, UserRole } from "../types";

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
    role: {
      type: String,
      enum: Object.values(UserRole),
    },
    teamCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    organizationName: {
      type: String,
      default: "",
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    walkthrough: [{
      page_name: {
        type: String,
        required: true,
      },
      completed: {
        type: Boolean,
        required: true,
        default: false,
      },
    }],
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<TUser>("User", user_schema);

export default User;

