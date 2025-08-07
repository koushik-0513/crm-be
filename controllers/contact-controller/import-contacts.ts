import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import Activity from '../../models/activity-Model';
import Tag from "../../models/tags-Model";
import { ActivityTypes, TAuthenticatedRequest } from '../../types';
import { log_activity } from '../../activitylogger';

export type TContactImport = {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags?: string[] | string;
  note?: string;
}

export type TImportContactsRequest = {
  contacts: TContactImport[];
}

// Zod Schema for validation
const import_contacts_schema = z.object({
  body: z.object({
    contacts: z.array(z.object({
      name: z.string().min(1, "Name is required").max(100, "Name too long"),
      email: z.string().email("Invalid email format"),
      phone: z.string().min(1, "Phone is required"),
      company: z.string().min(1, "Company is required"),
      tags: z.union([z.string(), z.array(z.string())]).optional(),
      note: z.string().optional(),
    })).min(1, "At least one contact is required"),
  }),
});

export const import_contacts = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = import_contacts_schema.parse(req);
    const { contacts } = validated_data.body;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Process each contact
    for (let i = 0; i < contacts.length; i++) {
      const contactData = contacts[i];
      
      try {
        // Check if contact with same email already exists
        const existingContact = await Contact.findOne({ 
          user: user_id, 
          email: contactData.email 
        });
        
        if (existingContact) {
          skippedCount++;
          errors.push(`Row ${i + 1}: Contact with email ${contactData.email} already exists`);
          continue;
        }

        // Process tags
        let processedTags: string[] = [];
        if (contactData.tags) {
          if (typeof contactData.tags === 'string') {
            processedTags = contactData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          } else if (Array.isArray(contactData.tags)) {
            processedTags = contactData.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
          }
        }

        // Ensure tags exist in Tag collection
        if (processedTags.length > 0) {
          const tagUpsertPromises = processedTags.map(async (tagName) => {
            const existingTag = await Tag.findOne({ name: tagName, user: user_id });
            if (!existingTag) {
              const newTag = await Tag.findOneAndUpdate(
                { name: tagName, user: user_id },
                { $setOnInsert: { name: tagName, user: user_id, color: "#3b82f6" } },
                { upsert: true, new: true }
              );
              return newTag;
            }
            return existingTag;
          });
          await Promise.all(tagUpsertPromises);
        }

        // Create new contact
        const newContact = new Contact({
          ...contactData,
          tags: processedTags,
          user: user_id,
          lastInteraction: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await newContact.save();
        importedCount++;

      } catch (error) {
        skippedCount++;
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Log bulk import activity
    if (importedCount > 0) {
      await log_activity(
        user_id,
        ActivityTypes.BULK_IMPORT_CONTACTS,
        `Bulk imported ${importedCount} contacts, skipped ${skippedCount}`
      );
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${importedCount} imported, ${skippedCount} skipped`,
      importedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined
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
    console.error("Error importing contacts:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to import contacts" 
    });
  }
}; 