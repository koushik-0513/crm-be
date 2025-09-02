import { Request, Response } from "express";
import { z } from "zod";
import User from "../../models/user-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const get_profile_schema = z.object({
  // No body validation needed for GET requests
});

export const get_profile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request (no body validation needed for GET)
    const validated_data = get_profile_schema.parse(req);

    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;
    const user = await User.findOne({ uid: user_id });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        _id: user._id,
        uid: user.uid,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        company: user.company || "",
        photoUrl: user.photoUrl || "",
        role: user.role || "",
        organizationName: user.organizationName || "",
        teamCode: user.teamCode || "",
        team: user.team,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        walkthrough: user.walkthrough || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: "Profile retrieved successfully",
      success: true,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error retrieving profile:", errorMessage);
    res.status(500).json({ error: "Failed to retrieve profile" });
  }
}; 