import { Request, Response } from "express";
import { z } from "zod";
import Tag from "../../models/tags-Model";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, TAuthenticatedRequest } from "../../types";

export type TUpdateTagParams = {
  tagId: string;
  tagData: { name: string; color: string };
}

// Zod Schema for validation
const edit_tag_schema = z.object({
  params: z.object({
    tagId: z.string().min(1, "Tag ID is required"),
  }),
  body: z.object({
    name: z.string().min(1, "Tag name is required").max(50, "Tag name too long"),
    color: z.string().min(1, "Tag color is required").regex(/^#[0-9A-F]{6}$/i, "Invalid color format"),
  }),
});

export const edit_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = edit_tag_schema.parse(req);
    const { tagId } = validated_data.params;
    const { name, color } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    const tag = await Tag.findOne({ _id: tagId, user: user_id });
    if (!tag) {
      res.status(404).json({ success: false, error: "Tag not found" });
      return;
    }

    const old_name = tag.name;
    const old_color = tag.color;

    tag.name = name;
    tag.color = color;
    await tag.save();

    await log_activity(
      user_id,
      ActivityTypes.TAG_EDITED,
      `Updated tag: ${old_name} (${old_color}) → ${name} (${color})`
    );

    res.json({
      success: true,
      message: "Tag updated successfully",
      tag,
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
    console.error("Error updating tag:", errorMessage);
    res.status(500).json({ success: false, error: "Failed to update tag" });
  }
}; 