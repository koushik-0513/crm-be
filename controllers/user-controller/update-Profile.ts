import { Request, Response } from "express";
import { z } from "zod";
import User from "../../models/user-Model";
import { v2 as cloudinary } from "cloudinary";
import { log_activity } from "../../activitylogger";
import { ActivityTypes, TAuthenticatedRequest } from '../../types';

export type TUpdateProfileBody = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
}

// Cloudinary config
cloudinary.config({
  cloud_name: 'ddlrkl4jy',
  api_key: '212535856243683',
  api_secret: 'nGJwawCFcUd0VXpesvJI_VHTxeg',
});

// Zod Schema for validation
const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    company: z.string().optional(),
    photoUrl: z.string().optional(),
  }),
});

export const update_profile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validatedData = UpdateProfileSchema.parse(req);
    const { name, email, phone, company, photoUrl: newPhotoUrl } = validatedData.body;

    const authReq = req as TAuthenticatedRequest;
    const existingUser = await User.findOne({ uid: authReq.user.uid });
    
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let finalPhotoUrl = existingUser.photoUrl;

    if (newPhotoUrl) {
      if (newPhotoUrl.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(newPhotoUrl, {
            folder: "avatars",
            public_id: `avatar_${authReq.user.uid}`,
            overwrite: true,
            resource_type: "image",
          });
          finalPhotoUrl = uploadResult.secure_url;
        } catch (uploadError: unknown) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)
      console.error("Cloudinary upload failed:", errorMessage);
          res.status(500).json({ error: "Failed to upload image to Cloudinary" });
          return;
        }
      } else if (newPhotoUrl.startsWith("http")) {
        finalPhotoUrl = newPhotoUrl;
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { uid: authReq.user.uid },
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone || "",
        company: company || "",
        photoUrl: finalPhotoUrl,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ error: "User not found after update" });
      return;
    }

    // Log profile update activity
    await log_activity(
      authReq.user.uid,
      ActivityTypes.CONTACT_EDITED,
      `Updated profile: ${updatedUser.name} (${updatedUser.email})`
    );

    res.status(200).json({
      success: true,
      user: {
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        company: updatedUser.company || "",
        photoUrl: updatedUser.photoUrl || "",
      },
      message: "Profile updated successfully",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        error: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error updating profile:", errorMessage);
    res.status(500).json({ error: "Failed to update profile" });
  }
}; 