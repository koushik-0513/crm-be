import { Request, Response } from "express";
import { z } from "zod";
import Tag from "../../models/tags-Model";
import Contact from "../../models/contact-Model";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, TAuthenticatedRequest } from "../../types";

export type TDeleteTagParams = {
  tagId: string;
  force?: boolean;
}

// Zod Schema for validation
const delete_tag_schema = z.object({
  params: z.object({
    id: z.string().min(1, "Tag ID is required"),
  }),
  query: z.object({
    force: z.string().optional(),
  }),
});

export const delete_tag = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = delete_tag_schema.parse(req);
    const { id } = validated_data.params;
    const { force } = validated_data.query;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    const tag_to_delete = await Tag.findById(id);
    if (!tag_to_delete) {
      res.status(404).json({ success: false, error: "Tag not found" });
      return;
    }

    const contact_count = await Contact.countDocuments({
      user: user_id,
      tags: tag_to_delete.name,
    });

    if (contact_count > 0) {
      if (force === "true") {
        await Contact.updateMany(
          { user: user_id, tags: tag_to_delete.name },
          { $pull: { tags: tag_to_delete.name } }
        );

        await Tag.findByIdAndDelete(id);

        await log_activity(
          user_id,
          ActivityTypes.FORCE_DELETE_TAG,
          `Force deleted tag "${tag_to_delete.name}" and removed from ${contact_count} contacts`
        );

        res.status(200).json({
          message: `Tag "${tag_to_delete.name}" force deleted and removed from ${contact_count} contacts`,
          success: true,
        });
      } else {
        res.status(400).json({
          error: `Cannot delete tag "${tag_to_delete.name}" - it is currently used by ${contact_count} contact(s)`,
          success: false,
          tagName: tag_to_delete.name,
          contactCount: contact_count,
          suggestion: "Use ?force=true to remove tag from all contacts and delete it",
        });
      }
    } else {
      await Tag.findByIdAndDelete(id);

      await log_activity(
        user_id,
        ActivityTypes.TAG_DELETED,
        `Deleted unused tag: "${tag_to_delete.name}"`
      );

      res.status(200).json({
        message: `Tag "${tag_to_delete.name}" deleted successfully`,
        success: true,
      });
    }
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
    console.error("Error deleting tag:", errorMessage);
    res.status(500).json({ success: false, error: "Failed to delete tag" });
  }
}; 