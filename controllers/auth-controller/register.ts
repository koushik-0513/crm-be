import { Request, Response } from "express";
import { z } from "zod";
import User from "../../models/user-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const register_schema = z.object({
  body: z.object({
    uid: z.string().min(1, "UID is required"),
    email: z.string().email("Valid email is required"),
    name: z.string().optional(),
    photoURL: z.string().optional(),
  }),
});

export const register_user = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = register_schema.parse(req);
    const { uid, email, name, photoURL } = validated_data.body;

    // First check if user exists by uid
    let user = await User.findOne({ uid });

    if (!user) {
      // If not found by uid, check by email
      user = await User.findOne({ email });
      
      if (!user) {
        // Create new user if not found by either uid or email
        user = new User({
          uid,
          email,
          name: name || "",
          photoURL: photoURL || "",
        });
        await user.save();
      } else {
        // User exists by email but not uid, update the uid
        user.uid = uid;
        if (name) user.name = name;
        if (photoURL) user.photoURL = photoURL;
        await user.save();
      }
    } else {
      // User exists by uid, update other fields if provided
      if (name) user.name = name;
      if (photoURL) user.photoURL = photoURL;
      await user.save();
    }

    res.status(201).json({ message: "User synced successfully", user });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

          const errorMessage = error instanceof Error ? error.message : String(error)
      console.error("Sync error:", errorMessage);
    res.status(500).json({ error: "Failed to sync user" });
  }
}; 