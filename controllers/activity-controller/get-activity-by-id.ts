import { Request, Response } from "express";
import { z } from "zod";
import Activity from "../../models/activity-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const GetActivityByIdSchema = z.object({
  params: z.object({
    contactId: z.string().min(1, "Contact ID is required"),
  }),
});

export const get_activity_by_id = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validatedData = GetActivityByIdSchema.parse(req);
    const { contactId } = validatedData.params;
    
    const authReq = req as TAuthenticatedRequest;
    
    // Find all activities for this contact and user
    const activities = await Activity.find({ 
      contactId: contactId,
      user: authReq.user.uid 
    })
    .sort({ timestamp: -1 })
    .lean();

    res.json({ 
      success: true,
      activities: activities,
      count: activities.length
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

    console.error("Error fetching activities for contact:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch activities",
      activities: [] 
    });
  }
}; 