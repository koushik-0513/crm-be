import { Request, Response } from "express";
import { z } from "zod";
import Contact from "../../models/contact-Model";
import Tag from "../../models/tags-Model";
import Activity from "../../models/activity-Model";
import { TAuthenticatedRequest } from "../../types";

export type TSearchQuery = {
  q: string;
  type?: string;
  limit?: string;
}

// Zod Schema for validation
const search_schema = z.object({
  query: z.object({
    q: z.string().optional(),
  }),
});

export const search_contacts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validated_data = search_schema.parse(req);
    const q = validated_data.query.q;
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user?.uid;

    if (!q || typeof q !== 'string' || !q.trim()) {
      res.json({ 
        pages: [],
        data: {
          contacts: [],
          tags: [],
          activities: []
        }
      });
      return;
    }

    if (!user_id) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const searchQuery = q.trim();
    const regex = new RegExp(searchQuery, "i");

    const [contacts, tags, activities] = await Promise.all([
      Contact.find({
        $and: [
          { user: user_id }, // Filter by user
          { $or: [{ name: regex }, { email: regex }] }
        ]
      }).limit(5),
      Tag.find({
        $and: [
          { user: user_id }, // Filter by user
          { name: regex }
        ]
      }).limit(5),
      Activity.find({
        $and: [
          { user: user_id }, // Filter by user
          { details: regex }
        ]
      }).limit(5), 
    ]);

    res.json({ 
      pages: [],
      data: {
        contacts,
        tags,
        activities
      }
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

    console.error("Search failed:", error);
    res.status(500).json({ error: "Search failed", details: error instanceof Error ? error.message : "Unknown error" });
  }
}; 