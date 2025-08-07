import { Request, Response } from "express";
import { z } from "zod";
import Tag from "../../models/tags-Model";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, TAuthenticatedRequest } from "../../types";

export type TTagPayload = {
  name: string;
  color?: string;
}

export type TTagData = {
  name: string;
  color: string;
}

// Zod Schema for validation
const create_tag_schema = z.object({
  body: z.object({
    name: z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
    color: z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  }),
});

export const create_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = create_tag_schema.parse(req);
    const { name, color } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Check if tag already exists
    const existing_tag = await Tag.findOne({ user: user_id, name });
    if (existing_tag) {
      res.status(400).json({ success: false, error: "Tag already exists" });
      return;
    }

    const new_tag = await Tag.create({ name, color, user: user_id });

    await log_activity(
      user_id,
      ActivityTypes.TAG_CREATED,
      `Created tag: ${name} with color ${color}`
    );

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      tag: new_tag,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        success: false,
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error creating tag:", errorMessage);
    res.status(500).json({ success: false, error: "Failed to create tag" });
  }
}; 