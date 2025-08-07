import Activity from "./models/activity-Model";
import { ActivityTypes } from "./types";

// Optional: Interface for log_activity function parameters
export const log_activity = async (
  user_id: string,
  activity_type: ActivityTypes,
  details: string = "",
  contact_id?: string
): Promise<void> => {
  try {
    if (!user_id) {
      console.error("No user ID provided for activity logging");
      return;
    }

    await Activity.create({
      user: user_id,
      activityType: activity_type,
      details,
      contactId: contact_id || undefined,
      timestamp: new Date(),
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Activity logging failed:", errorMessage);
  }
};
