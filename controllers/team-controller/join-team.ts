import { Request, Response } from "express";
import { TAuthenticatedRequest } from "../../types";
import Team from "../../models/team-Model";
import User from "../../models/user-Model";

export const join_team = async (req: Request, res: Response): Promise<void> => {
  try {
    const auth_req = req as TAuthenticatedRequest;
    const user_uid = auth_req.user.uid;
    const { teamCode } = req.body;

    if (!teamCode) {
      res.status(400).json({ 
        success: false, 
        error: "Team code is required" 
      });
      return;
    }

    // Validate team code format (6 characters, alphanumeric)
    if (!/^[A-Z0-9]{6}$/.test(teamCode.toUpperCase())) {
      res.status(400).json({ 
        success: false, 
        error: "Team code must be exactly 6 characters (letters and numbers only)" 
      });
      return;
    }

    // Get current user
    const current_user = await User.findOne({ uid: user_uid });
    if (!current_user) {
      res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
      return;
    }

    // Check if user is already in a team
    if (current_user.team) {
      res.status(400).json({ 
        success: false, 
        error: "You are already a member of a team. Leave your current team first." 
      });
      return;
    }

    // Find the team by code
    const team = await Team.findOne({ code: teamCode.toUpperCase() });
    if (!team) {
      res.status(404).json({ 
        success: false, 
        error: "Invalid team code. Please check the code and try again." 
      });
      return;
    }

    // Get team admin info
    const admin_user = await User.findOne({ uid: team.admin });
    if (!admin_user) {
      res.status(404).json({ 
        success: false, 
        error: "Team admin not found" 
      });
      return;
    }

    // Check if user is already a member of this team
    if (team.members.includes(user_uid)) {
      res.status(400).json({ 
        success: false, 
        error: "You are already a member of this team" 
      });
      return;
    }

    // Check if team has space for new members
    if (team.members.length >= team.settings.maxMembers) {
      res.status(400).json({ 
        success: false, 
        error: "Team is at maximum capacity" 
      });
      return;
    }

    // Add user to team
    team.members.push(user_uid);
    await team.save();

    // Update user with team info
    current_user.team = team._id;
    current_user.teamCode = team.code;
    current_user.organizationName = team.name;
    current_user.role = "user"; // Set role to user when joining team
    await current_user.save();

    res.status(200).json({
      success: true,
      message: "Successfully joined team",
      data: {
        teamName: team.name,
        adminName: admin_user.name || admin_user.email,
        memberCount: team.members.length,
        maxMembers: team.settings.maxMembers
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Join team error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to join team" 
    });
  }
};
