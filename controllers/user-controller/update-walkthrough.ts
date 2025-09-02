import { Request, Response } from "express";
import { z } from "zod";
import User from "../../models/user-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const update_walkthrough_schema = z.object({
  body: z.object({
    page_name: z.string().min(1, "Page name is required"),
    completed: z.boolean(),
  }),
});

// Define the walkthrough item type
type TWalkthroughItem = {
  page_name: string;
  completed: boolean;
};

export const update_walkthrough = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = update_walkthrough_schema.parse(req);
    const { page_name, completed } = validated_data.body;

    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;
    const user = await User.findOne({ uid: user_id });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Initialize walkthrough array if it doesn't exist
    if (!user.walkthrough) {
      user.walkthrough = [];
    }

    // Find existing walkthrough entry for this page
    const existing_walkthrough = user.walkthrough.find((w: TWalkthroughItem) => w.page_name === page_name);
    
    if (existing_walkthrough) {
      // Update existing entry
      existing_walkthrough.completed = completed;
    } else {
      // Add new entry
      user.walkthrough.push({
        page_name,
        completed
      });
    }

    // Save user
    await user.save();

    res.status(200).json({
      message: "Walkthrough status updated successfully",
      data: {
        walkthrough: user.walkthrough
      },
      success: true,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Walkthrough update error:", errorMessage);
    res.status(500).json({ error: "Failed to update walkthrough status" });
  }
};
