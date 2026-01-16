
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a product description using the Gemini API.
 * 
 * Guidelines:
 * - The API key must be obtained exclusively from the environment variable `process.env.API_KEY`.
 * - Use `new GoogleGenAI({ apiKey: process.env.API_KEY })` directly.
 * - Create a new instance right before making an API call for consistency.
 */
export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return "وصف رائع للمنتج (يرجى إعداد مفتاح API لتوليد وصف بالذكاء الاصطناعي).";
  }

  try {
    // Guidelines: Initialize the client using named parameter right before usage.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-flash-preview';
    const prompt = `
      اكتب وصفًا جذابًا وتسويقيًا قصيرًا (لا يتجاوز 30 كلمة) لمنتج اسمه "${productName}" 
      يقع ضمن فئة "${category}".
      الوصف يجب أن يكون باللهجة الجزائرية المفهومة أو العربية الفصحى البسيطة، ومناسب لتطبيق بيع محلي.
    `;

    // Guidelines: Use ai.models.generateContent with model name and prompt directly.
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    // Guidelines: Access the generated text via the .text property (not a method).
    return response.text?.trim() || "وصف رائع للمنتج.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "لا يمكن توليد الوصف حالياً. يرجى المحاولة لاحقاً.";
  }
};
