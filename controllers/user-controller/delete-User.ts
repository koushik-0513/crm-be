import { Request, Response } from "express";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import User from "../../models/user-Model";
import Contact from "../../models/contact-Model";
import Tag from "../../models/tags-Model";
import Activity from "../../models/activity-Model";
import ChatMessage from "../../models/chat-Model";
import MessageHistory from "../../models/message-History-Model";
import VectorStore from "../../models/vector-Store-Model";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const DeleteUserSchema = z.object({
  // No body validation needed for DELETE requests
});

export const delete_user = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request (no body validation needed for DELETE)
    DeleteUserSchema.parse({});

    const authReq = req as TAuthenticatedRequest;
    const userId = authReq.user.uid;

    // Get user before deletion for logging
    const user = await User.findOne({ uid: userId });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete all user data in parallel (including MessageHistory and VectorStore)
    await Promise.all([
      Contact.deleteMany({ user: userId }),
      Tag.deleteMany({ user: userId }),
      Activity.deleteMany({ user: userId }),
      ChatMessage.deleteMany({ user: userId }),
      MessageHistory.deleteMany({ user: userId }),
      VectorStore.deleteMany({ user: userId }),
      User.deleteOne({ uid: userId }),
    ]);

    // Delete user from Firebase Auth
    try {
      await getAuth().deleteUser(userId);
    } catch (error) {
      console.error("Error deleting user from Firebase Auth:", error);
      // Continue with response even if Firebase Auth deletion fails
    }

    // Don't log account deletion activity since we're deleting all user data
    // This prevents any leftover activity data from interfering with new user walkthrough

    res.status(200).json({
      success: true,
      message: "Account and all associated data deleted successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error deleting user:", errorMessage);
    res.status(500).json({ error: "Failed to delete account" });
  }
}; 