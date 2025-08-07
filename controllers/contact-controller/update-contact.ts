import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import Tag from '../../models/tags-Model';
import { ActivityTypes, TAuthenticatedRequest } from '../../types';
import { log_activity } from '../../activitylogger';
import { requireAuthentication } from '../../types/auth-Types';

export type TContactData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags?: string[] | string;
  note?: string;
}

export type TContactForm = TContactData;

type TContactUpdatePayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  note?: string;
  updatedAt: Date;
};

// Zod Schema for validation
const update_contact_schema = z.object({
  params: z.object({
    id: z.string().min(1, "Contact ID is required"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
    email: z.string().email("Invalid email format").optional(),
    phone: z.string().min(1, "Phone is required").optional(),
    company: z.string().min(1, "Company is required").optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    note: z.string().optional(),
  }),
});

export const update_contact = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = update_contact_schema.parse(req);
    const { id } = validated_data.params;
    const update_data = validated_data.body;
    
    const user = requireAuthentication(req);
    const user_id = user.uid;

    // Check if contact exists and belongs to user
    const existing_contact = await Contact.findOne({ _id: id, user: user_id });
    if (!existing_contact) {
      return res.status(404).json({ 
        success: false, 
        message: "Contact not found" 
      });
    }

    // Check if email is being updated and if it conflicts with another contact
    if (update_data.email && update_data.email !== existing_contact.email) {
      const emailConflict = await Contact.findOne({ 
        user: user_id, 
        email: update_data.email,
        _id: { $ne: id } // Exclude current contact
      });
      if (emailConflict) {
        return res.status(400).json({ 
          success: false, 
          message: "Contact with this email already exists" 
        });
      }
    }

    // Process tags - handle both string and array formats
    let processedTags: string[] = [];
    if (update_data.tags) {
      if (typeof update_data.tags === 'string') {
        // If tags come as comma-separated string, split them
        processedTags = update_data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(update_data.tags)) {
        processedTags = update_data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    // If tags are provided, ensure they exist in the Tag collection
    if (processedTags.length > 0) {
      const tagUpsertPromises = processedTags.map(async (tagName) => {
        const existingTag = await Tag.findOne({ name: tagName, user: user_id });
        if (!existingTag) {
          const newTag = await Tag.findOneAndUpdate(
            { name: tagName, user: user_id },
            { $setOnInsert: { name: tagName, user: user_id, color: "#3b82f6" } },
            { upsert: true, new: true }
          );
          // Log tag creation activity
          await log_activity(
            user_id,
            ActivityTypes.TAG_CREATED,
            `Created tag: ${newTag.name} with color ${newTag.color}`
          );
          return newTag;
        }
        return existingTag;
      });
      await Promise.all(tagUpsertPromises);
    }

    // Prepare update data
    const updatePayload: TContactUpdatePayload = {
      ...update_data,
      tags: processedTags,
      updatedAt: new Date()
    };

    // Remove undefined values
    Object.keys(updatePayload).forEach(key => {
      if (key in updatePayload && updatePayload[key as keyof TContactUpdatePayload] === undefined) {
        delete updatePayload[key as keyof TContactUpdatePayload];
      }
    });

    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found after update"
      });
    }

    // Log contact update activity
    const contactDetails = [
      `Name: ${updatedContact.name}`,
      `Email: ${updatedContact.email}`,
      `Phone: ${updatedContact.phone}`,
      `Company: ${updatedContact.company}`
    ];
    
    if (processedTags.length > 0) {
      contactDetails.push(`Tags: ${processedTags.join(', ')}`);
    }
    
    if (updatedContact.note) {
      contactDetails.push(`Note: ${updatedContact.note}`);
    }

      await log_activity(
      user_id,
      ActivityTypes.CONTACT_EDITED,
      `Updated contact: ${contactDetails.join(', ')}`
    );

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      contact: updatedContact
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
    console.error("Error updating contact:", errorMessage);
    res.status(500).json({ 
      success: false,
      error: "Failed to update contact" 
    });
  }
}; 