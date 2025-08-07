import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const get_contact_by_id_schema = z.object({
  params: z.object({
    id: z.string().min(1, "Contact ID is required"),
  }),
});

export const get_contact_by_id = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = get_contact_by_id_schema.parse(req);
    const { id } = validated_data.params;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    const contact = await Contact.findOne({ _id: id, user: user_id });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact retrieved successfully",
      contact
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
    console.error("Error retrieving contact:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to retrieve contact" 
    });
  }
}; 