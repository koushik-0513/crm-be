import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const count_contacts_schema = z.object({
  // No body validation needed for GET requests
});

export const count_of_contact = async (req: Request, res: Response) => {
  try {
    // Validate request (no body validation needed for GET)
    count_contacts_schema.parse({});
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Get total count
    const total_contacts = await Contact.countDocuments({ user: user_id });

    res.status(200).json({
      success: true,
      message: "Contact count retrieved successfully",
      count: total_contacts
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
    console.error("Error counting contacts:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to count contacts" 
    });
  }
}; 