import { Request, Response } from "express";
import { z } from "zod";
import Contact from "../../models/contact-Model";
import Activity from "../../models/activity-Model";
import Tag from "../../models/tags-Model";
import { TAuthenticatedRequest } from "../../types";

// Zod Schema for validation
const get_dashboard_stats_schema = z.object({
  // No body validation needed for GET requests
});

export const get_dashboard_stats = async (req: Request, res: Response) => {
  try {
    // Validate request (no body validation needed for GET)
    get_dashboard_stats_schema.parse({});
    
    const auth_req = req as TAuthenticatedRequest;
    const user_id = auth_req.user.uid;

    // Get all contacts for the user
    const all_contacts = await Contact.find({ user: user_id }).lean();

    // Get total contacts count
    const total_contacts = all_contacts.length;

    // Calculate new contacts this week
    const one_week_ago = new Date();
    one_week_ago.setDate(one_week_ago.getDate() - 7);
    const new_this_week = all_contacts.filter(contact => 
      contact.createdAt && new Date(contact.createdAt) >= one_week_ago
    ).length;

    // Get contacts by company
    const contacts_by_company = await Contact.aggregate([
      { $match: { user: user_id } },
      { $group: { _id: "$company", contacts: { $sum: 1 } } },
      { $sort: { contacts: -1 } },
      { $limit: 10 }
    ]);

    // Get tag distribution
    const tag_distribution = await Tag.aggregate([
      { $match: { user: user_id } },
      {
        $lookup: {
          from: "contacts",
          localField: "name",
          foreignField: "tags",
          as: "contactCount"
        }
      },
      {
        $project: {
          name: 1,
          count: { $size: "$contactCount" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get total activities count
    const activities = await Activity.countDocuments({ user: user_id });

    // Get activities by day of the week for the last 7 days
    const seven_days_ago = new Date();
    seven_days_ago.setDate(seven_days_ago.getDate() - 7);
    
    const activities_by_day = await Activity.aggregate([
      { $match: { user: user_id, timestamp: { $gte: seven_days_ago } } },
      {
        $group: {
          _id: { $dayOfWeek: "$timestamp" }, // Returns 1-7 (Sunday=1, Saturday=7)
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert activitiesByDay to Record format with day names
    const activities_by_day_record: Record<string, number> = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0
    };
    
    // Map MongoDB day numbers to day names (1=Sunday, 2=Monday, etc.)
    const day_number_to_name: Record<number, string> = {
      1: 'Sunday',
      2: 'Monday', 
      3: 'Tuesday',
      4: 'Wednesday',
      5: 'Thursday',
      6: 'Friday',
      7: 'Saturday'
    };
    
    activities_by_day.forEach(item => {
      const day_name = day_number_to_name[item._id as number];
      if (day_name) {
        activities_by_day_record[day_name] = item.count;
      }
    });

    const dashboard_stats = {
      allContacts: all_contacts,
      totalContacts: total_contacts,
      newThisWeek: new_this_week,
      contactsByCompany: contacts_by_company.map(item => ({
        name: item._id || "Unknown",
        contacts: item.contacts
      })),
      tagDistribution: tag_distribution.map(item => ({
        name: item.name,
        count: item.count
      })),
      activities,
      activitiesByDay: activities_by_day_record,
    };

    res.json({
      success: true,
      data: dashboard_stats
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

    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch dashboard stats" 
    });
  }
}; 