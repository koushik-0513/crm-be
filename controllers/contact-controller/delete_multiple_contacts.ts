import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import Activity from '../../models/activity-Model';
import { ActivityTypes, TAuthenticatedRequest } from '../../types';
import { log_activity } from '../../activitylogger';

export type TDeleteMultipleContactsRequest = {
  ids: string[];
}

// Zod Schema for validation
const delete_multiple_contacts_schema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, "At least one contact ID is required"),
  }),
});

export const delete_multiple_contacts = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = delete_multiple_contacts_schema.parse(req);
    const { ids } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Get contacts before deletion for logging
    const contacts = await Contact.find({ _id: { $in: ids }, user: user_id });
    
    if (contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No contacts found to delete"
      });
    }

    // Delete the contacts
    const result = await Contact.deleteMany({ _id: { $in: ids }, user: user_id });

    // Log bulk deletion activity
    const contactNames = contacts.map(contact => contact.name).join(', ');
    await log_activity(
      user_id,
      ActivityTypes.BULK_DELETE_CONTACTS,
      `Bulk deleted ${result.deletedCount} contacts: ${contactNames}`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} contacts`,
      deletedCount: result.deletedCount
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
    console.error("Error deleting multiple contacts:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to delete contacts" 
    });
  }
}; 