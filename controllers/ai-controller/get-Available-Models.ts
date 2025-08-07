import { Request, Response } from "express";
import { z } from "zod";
import { 
  get_all_available_models, 
  get_recommended_fallbacks, 
  is_model_available,
  AI_PROVIDERS
} from "../../lib/ai-Providers";

// Zod Schema for validation
const GetAvailableModelsSchema = z.object({
  // No body validation needed for GET requests
});

export const get_available_models = async (req: Request, res: Response) => {
  try {
    // Validate request (no body validation needed for GET)
    GetAvailableModelsSchema.parse({});
    
    const models = get_all_available_models();
    const modelInfo = models.map(model => ({
      name: model,
      available: is_model_available(model),
      fallbacks: get_recommended_fallbacks(model),
    }));

    res.json({
      success: true,
      models: modelInfo,
      providers: AI_PROVIDERS,
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

    console.error("Error fetching available models:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch available models" 
    });
  }
}; 