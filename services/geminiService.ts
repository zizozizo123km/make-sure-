
import { GoogleGenAI } from "@google/genai";

// Safe API Key access
const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "وصف رائع للمنتج (يرجى إعداد مفتاح API لتوليد وصف بالذكاء الاصطناعي).";
  }

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `
      اكتب وصفًا جذابًا وتسويقيًا قصيرًا (لا يتجاوز 30 كلمة) لمنتج اسمه "${productName}" 
      يقع ضمن فئة "${category}".
      الوصف يجب أن يكون باللهجة الجزائرية المفهومة أو العربية الفصحى البسيطة، ومناسب لتطبيق بيع محلي.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "وصف رائع للمنتج.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "لا يمكن توليد الوصف حالياً. يرجى المحاولة لاحقاً.";
  }
};
