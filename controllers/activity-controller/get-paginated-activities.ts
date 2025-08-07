import { Request, Response } from "express";
import { z } from "zod";
import Activity from "../../models/activity-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const GetPaginatedActivitiesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const get_paginated_activities = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validatedData = GetPaginatedActivitiesSchema.parse(req);
    const page = parseInt(validatedData.query.page || '1');
    const limit = parseInt(validatedData.query.limit || '5');
    const skip = (page - 1) * limit;
    
    const authReq = req as  TAuthenticatedRequest;

    const activities = await Activity.find({ user: authReq.user.uid })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(activities);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    console.error("[ActivityController] Error fetching activities:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}; 