import { Request, Response } from "express";
import { TAuthenticatedRequest } from "../../types";
import Team from "../../models/team-Model";
import User from "../../models/user-Model";

export const get_team_info = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast to authenticated request after middleware
    const auth_req = req as TAuthenticatedRequest;
    const user_uid = auth_req.user.uid;

    // Get current user
    const current_user = await User.findOne({ uid: user_uid });
    if (!current_user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Individual users don't have team info
    if (current_user.role === "individual") {
      res.status(200).json({
        success: true,
        data: {
          hasTeam: false,
          role: current_user.role,
        },
      });
      return;
    }

    // Get team information
    if (!current_user.team) {
      res.status(200).json({
        success: true,
        data: {
          hasTeam: false,
          role: current_user.role,
        },
      });
      return;
    }

    const team = await Team.findById(current_user.team)
      .populate("admin", "uid name email photoUrl")
      .populate("members", "uid name email photoUrl role");

    if (!team) {
      res.status(404).json({ success: false, error: "Team not found" });
      return;
    }

    // Check if user is admin
    const is_admin = team.admin.uid === user_uid;

    res.status(200).json({
      success: true,
      data: {
        hasTeam: true,
        role: current_user.role,
        isAdmin: is_admin,
        team: {
          id: team._id,
          name: team.name,
          code: team.code,
          description: team.description,
          admin: team.admin,
          members: team.members,
          memberCount: team.members.length,
          maxMembers: team.settings.maxMembers,
          settings: team.settings,
          createdAt: team.createdAt,
        },
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Get team info error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch team information" 
    });
  }
};
