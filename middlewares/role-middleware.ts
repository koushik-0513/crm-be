import { Response, NextFunction } from "express";
import { TAuthenticatedRequest, UserRole } from "../types";

export const require_role = (allowed_roles: UserRole[]) => {
  return (req: TAuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const user_role = req.user?.role;
      
      if (!user_role) {
        res.status(403).json({ 
          success: false,
          error: "Role not assigned. Please complete your profile setup." 
        });
        return;
      }

      if (!allowed_roles.includes(user_role)) {
        res.status(403).json({ 
          success: false,
          error: "Insufficient permissions for this action" 
        });
        return;
      }

      next();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Role middleware error:", errorMessage);
      res.status(500).json({ 
        success: false,
        error: "Internal server error" 
      });
    }
  };
};

export const require_admin = require_role([UserRole.ADMIN]);
export const require_team_member = require_role([UserRole.ADMIN, UserRole.USER]);
export const require_individual_or_team = require_role([UserRole.ADMIN, UserRole.USER, UserRole.INDIVIDUAL]);

export const require_same_team = async (req: TAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const current_user_uid = req.user.uid;
    const target_user_uid = req.params.userId || req.body.userId;

    if (!target_user_uid) {
      next();
      return;
    }

    // Import here to avoid circular dependencies
    const User = (await import("../models/user-Model")).default;
    
    const current_user = await User.findOne({ uid: current_user_uid });
    const target_user = await User.findOne({ uid: target_user_uid });

    if (!current_user || !target_user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Individual users can only access their own data
    if (current_user.role === UserRole.INDIVIDUAL) {
      if (current_user_uid !== target_user_uid) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }
      next();
      return;
    }

    // Team members can access data from the same team
    if (current_user.team && target_user.team) {
      if (current_user.team.toString() === target_user.team.toString()) {
        next();
        return;
      }
    }

    res.status(403).json({ success: false, error: "Access denied" });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Same team middleware error:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};
