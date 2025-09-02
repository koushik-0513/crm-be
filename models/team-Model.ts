import mongoose, { Document, Schema, model, models } from "mongoose";

export type TTeam = Document & {
  name: string;
  code: string;
  admin: string; // User UID
  members: string[]; // Array of User UIDs
  description?: string;
  settings: {
    allowMemberInvites: boolean;
    maxMembers: number;
    notificationPreferences: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
};

const team_schema = new Schema<TTeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    admin: {
      type: String,
      required: true,
      ref: "User",
    },
    members: [{
      type: String,
      ref: "User",
    }],
    description: {
      type: String,
      default: "",
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      maxMembers: {
        type: Number,
        default: 50,
      },
      notificationPreferences: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

const Team = models.Team || model<TTeam>("Team", team_schema);

export default Team;
