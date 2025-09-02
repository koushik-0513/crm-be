import { Request, Response } from "express";
import { TAuthenticatedRequest } from "../../types";
import Notification from "../../models/notification-Model";

export const get_user_notifications = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast to authenticated request after middleware
    const auth_req = req as TAuthenticatedRequest;
    const user_uid = auth_req.user.uid;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const type = req.query.type as string;

    // Build query
    const query: any = { recipient_uid: user_uid };
    
    if (status && status !== "all") {
      query.status = status;
    }
    
    if (type && type !== "all") {
      query.type = type;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender_uid", "name email photoUrl");

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const total_pages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Get notifications error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch notifications" 
    });
  }
};
