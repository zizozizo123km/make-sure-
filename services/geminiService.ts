
import { GoogleGenAI } from "@google/genai";

// Fix: Initializing Gemini client with direct process.env.API_KEY access as required by SDK guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  try {
    const prompt = `
      اكتب وصفًا جذابًا وتسويقيًا قصيرًا (لا يتجاوز 30 كلمة) لمنتج اسمه "${productName}" 
      يقع ضمن فئة "${category}".
      الوصف يجب أن يكون باللهجة الجزائرية المفهومة أو العربية الفصحى البسيطة، ومناسب لتطبيق بيع محلي.
    `;

    // Fix: Using ai.models.generateContent with model name and prompt string.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Fix: Accessing the .text property directly instead of calling it as a method.
    return response.text?.trim() || "وصف رائع للمنتج.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "لا يمكن توليد الوصف حالياً. يرجى المحاولة لاحقاً.";
  }
};
