import { GoogleGenAI } from "@google/genai";

// تهيئة الخدمة بشكل آمن
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) return "وصف رائع للمنتج (الذكاء الاصطناعي غير مفعل).";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        اكتب وصفًا جذابًا وتسويقيًا قصيرًا (لا يتجاوز 30 كلمة) لمنتج اسمه "${productName}" 
        يقع ضمن فئة "${category}".
        الوصف يجب أن يكون باللهجة الجزائرية المفهومة أو العربية الفصحى البسيطة، ومناسب لتطبيق بيع محلي.
      `,
    });

    return response.text?.trim() || "وصف رائع للمنتج.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "لا يمكن توليد الوصف حالياً. يرجى المحاولة لاحقاً.";
  }
};