import ChatMessage from "../../models/chat-Model";
import Contact from "../../models/contact-Model";
import Activity from "../../models/activity-Model";
import Tag from "../../models/tags-Model";
import { TUserMessage, TUserContact, TIActivity } from "../../types";

export type TCRMContext = {
  contacts: Array<TUserContact>;
  activities: Array<TIActivity>;
  contactStats: {
    totalContacts: number;
    companiesCount: number;
    tagsCount: number;
  };
  topCompanies: { _id: string; count: number }[];
  tags: { name: string; color: string }[];
}

const DEFAULT_MODEL = 'gpt-4o-mini';

export const get_crm_context = async (user_id: string): Promise<TCRMContext | null> => {
  try {
    const contacts = await Contact.find({ user: user_id })
      .select("name email phone company tags note lastInteraction")
      .limit(50)
      .sort({ lastInteraction: -1 });

    const activities = await Activity.find({ user: user_id })
      .select("activityType details timestamp contactId")
      .sort({ timestamp: -1 });

    const contactStats = {
      totalContacts: await Contact.countDocuments({ user: user_id }),
      companiesCount: (await Contact.distinct("company", { user: user_id })).length,
      tagsCount: await Tag.countDocuments({ user: user_id }),
    };

    const topCompanies = await Contact.aggregate([
      { $match: { user: user_id } },
      { $group: { _id: "$company", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const tags = await Tag.find({ user: user_id }).select("name color");

    return { contacts, activities, contactStats, topCompanies, tags };
  } catch (error) {
    console.error("Error fetching CRM context:", error);
    return null;
  }
};

export const create_system_prompt = (crmContext: TCRMContext | null): string => {
  let systemPrompt = "You are an AI assistant for a CRM system...";

  if (crmContext) {
    const { contacts, activities, contactStats, topCompanies, tags } = crmContext;

    systemPrompt += `

CURRENT CRM DATA SUMMARY:
- Total Contacts: ${contactStats.totalContacts}
- Companies: ${contactStats.companiesCount}
- Tags: ${contactStats.tagsCount}

TOP COMPANIES (by contact count):
${topCompanies.map((c: { _id: string; count: number }) => `- ${c._id}: ${c.count} contacts`).join("\n")}

RECENT CONTACTS:
${contacts.slice(0, 10).map((c: TUserContact) => `- ${c.name} (${c.email}) at ${c.company}${c.tags?.length ? ` - Tags: ${c.tags.join(", ")}` : ""}`).join("\n")}

RECENT ACTIVITIES:
${activities.slice(0, 5).map((a: TIActivity) => `- ${a.activityType}: ${a.details} (${new Date(a.timestamp).toLocaleDateString()})`).join("\n")}

AVAILABLE TAGS:
${tags.map((t: { name: string; color: string }) => `- ${t.name}`).join("\n")}`;
  }

  systemPrompt += `

Always provide helpful, accurate information about the user's CRM data and assist with contact management tasks.`;

  return systemPrompt;
};

export const manage_conversation_context = async (
  { conversation, modelName = DEFAULT_MODEL }: { conversation: { _id: string; messages: TUserMessage[] }; modelName?: string }
): Promise<{ messages: TUserMessage[] }> => {
  const { messages } = conversation;

  const recentMessages = messages.slice(-10);

  return {
    messages: recentMessages,
  };
}; 