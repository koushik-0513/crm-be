import { Request, Response } from "express";
import { z } from "zod";
import admin from "../../firebase";
import User from "../../models/user-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const verify_token_schema = z.object({
  body: z.object({
    token: z.string().min(1, "Token is required"),
  }),
});

export const verify_token = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = verify_token_schema.parse(req);
    const { token } = validated_data.body;

    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, displayName, picture } = decodedToken;

    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({
        uid,
        email,
        displayName,
        photoURL: picture || "",
      });
    }

    res.status(200).json({ message: "Authenticated", user });
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
    console.error("Token verification failed:", errorMessage);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}; 