import { Request, Response } from 'express';
import { z } from 'zod';
import Contact from '../../models/contact-Model';
import { TAuthenticatedRequest } from '../../types';

export type TContactQueryFilter = {
  user: string;
  name?: { $regex: string; $options: string };
  email?: { $regex: string; $options: string };
  company?: { $regex: string; $options: string };
  tags?: { $in: string[] };
  $or?: Array<{
    name?: { $regex: string; $options: string };
    email?: { $regex: string; $options: string };
    company?: { $regex: string; $options: string };
  }>;
}

// Zod Schema for validation
const get_all_contacts_schema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    tags: z.string().optional(),
  }),
});

export const get_all_contacts = async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated_data = get_all_contacts_schema.parse(req);
    const { search, page, limit, tags } = validated_data.query;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Build query
    const query: TContactQueryFilter = { user: user_id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Pagination
    const page_number = parseInt(page || '1');
    const limit_number = parseInt(limit || '10');
    const skip = (page_number - 1) * limit_number;

    // Get total count
    const total_contacts = await Contact.countDocuments(query);
    
    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit_number);

    const total_pages = Math.ceil(total_contacts / limit_number);

    res.json({ 
      message: "Contacts fetched successfully", 
      contacts: contacts,
      pagination: {
        page: page_number,
        limit: limit_number,
        total: total_contacts,
        total_pages: total_pages,
        total_items: total_contacts,
      }
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ message: "Invalid request data", details: error.errors });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error retrieving contacts:", errorMessage);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
}; 