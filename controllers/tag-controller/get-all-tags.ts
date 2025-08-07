import { Request, Response } from "express";
import { z } from "zod";
import Tag from "../../models/tags-Model";
import Contact from "../../models/contact-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const GetTagsSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const get_all_tags = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validatedData = GetTagsSchema.parse(req);
    const { search = "", page = "1", limit = "10" } = validatedData.query;
    
    const authReq = req as TAuthenticatedRequest;
    const userId = authReq.user.uid;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: { user: string; name?: { $regex: string; $options: string } } = { user: userId };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Get tags with pagination
    const tags = await Tag.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const totalTags = await Tag.countDocuments(query);
    const totalPages = Math.ceil(totalTags / limitNum);

    // Get tag usage counts
    const tagCounts: { [key: string]: number } = {};
    for (const tag of tags) {
      const count = await Contact.countDocuments({
        user: userId,
        tags: tag.name,
      });
      tagCounts[tag.name] = count;
    }

    res.json({
      message: "Tags fetched successfully",
      tags: tags,
      tagCounts: tagCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalTags,
        total_pages: totalPages,
        total_items: totalTags,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      res.status(400).json({ 
        message: "Invalid request data",
        details: error.errors 
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Error fetching tags:", errorMessage);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
}; 