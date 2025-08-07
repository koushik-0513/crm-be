import { Request, Response } from "express";
import { z } from "zod";
import Tag from "../../models/tags-Model";
import { ActivityTypes, TAuthenticatedRequest } from '../../types';
import { log_activity } from "../../activitylogger";

export type TTagData = {
  name: string;
  color: string;
}

// Zod Schema for validation
const bulk_add_tags_schema = z.object({
  body: z.object({
    tags: z.array(z.object({
      name: z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
      color: z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
    })).min(1, "At least one tag is required"),
  }),
});

export const bulk_add_tags = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = bulk_add_tags_schema.parse(req);
    const { tags } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    const newTags: TTagData[] = [];
    const createdTagNames: string[] = [];

    for (const tag of tags) {
      const exists = await Tag.findOne({ user: user_id, name: tag.name });
      if (exists) continue;

      const newTag = await Tag.create({ name: tag.name, color: tag.color, user: user_id });
      newTags.push(newTag);
      createdTagNames.push(tag.name);
    }

    if (newTags.length === 0) {
      res.status(400).json({
        success: false,
        message: "No new tags were created (duplicates or invalid entries).",
      });
      return;
    }

    // Log a single activity for bulk tag creation with all tag names
    if (createdTagNames.length > 0) {
      const tagList = createdTagNames.join(", ");
      await log_activity(
        user_id,
        ActivityTypes.TAG_CREATED,
        `Bulk created ${createdTagNames.length} tags: ${tagList}`
      );
    }

    res.status(201).json({
      success: true,
      message: `${newTags.length} tag(s) created successfully`,
      tags: newTags,
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
    console.error("Error creating bulk tags:", errorMessage);
    res.status(500).json({ success: false, error: "Failed to create tags" });
  }
}; 