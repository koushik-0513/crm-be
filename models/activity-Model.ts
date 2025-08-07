import mongoose, { Document, Schema, model, models } from "mongoose";
import { TIActivity, ActivityTypes } from "../types";   

const activity_schema = new Schema<TIActivity>({
  contactId: { type: String, required: false },
  user: { type: String, required: true },
  activityType: {
    type: String, 
    enum: Object.values(ActivityTypes),
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
});

const Activity = models.Activity || model<TIActivity>("Activity", activity_schema);

export default Activity;
