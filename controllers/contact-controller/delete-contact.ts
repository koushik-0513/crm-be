import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import Activity from '../../models/activity-Model';
import { ActivityTypes, TAuthenticatedRequest } from '../../types';  
import { log_activity } from '../../activitylogger';

// Zod Schema for validation
const delete_contact_schema = z.object({
  params: z.object({
    id: z.string().min(1, "Contact ID is required"),
  }), 
});

export const delete_contact = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = delete_contact_schema.parse(req);
    const { id } = validated_data.params;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Get contact before deletion for logging
    const contact = await Contact.findOne({ _id: id, user: user_id });
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found"
      });
    }

    // Delete the contact
    await Contact.findByIdAndDelete(id);

    // Log contact deletion activity
    const contactDetails = [
      `Name: ${contact.name}`,
      `Email: ${contact.email}`,
      `Phone: ${contact.phone}`,
      `Company: ${contact.company}`
    ];
    
    if (contact.tags && contact.tags.length > 0) {
      contactDetails.push(`Tags: ${contact.tags.join(', ')}`);
    }
    
    if (contact.note) {
      contactDetails.push(`Note: ${contact.note}`);
    }

    await log_activity(
      user_id,
      ActivityTypes.CONTACT_DELETED,
      `Deleted contact: ${contactDetails.join(', ')}`
    );

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully"
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
    console.error("Error deleting contact:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete contact" 
    });
  }
}; 