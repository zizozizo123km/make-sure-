
import { GoogleGenAI } from "@google/genai";
import { StoreProfile } from "../types";

const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) return "منتج رائع بجودة عالية متوفر الآن في متجرنا.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `اكتب وصفًا تسويقيًا قصيرًا جدًا (15 كلمة كحد أقصى) لمنتج "${productName}" في قسم "${category}". استخدم لهجة جزائرية محببة أو عربية بسيطة.`,
    });
    return response.text?.trim() || "منتج رائع متوفر الآن.";
  } catch (error) {
    return "منتج عالي الجودة متوفر بأسعار مميزة.";
  }
};

export const getKimoAssistantResponse = async (userQuery: string, stores: StoreProfile[]): Promise<string> => {
  const ai = getAiInstance();
  if (!ai) return "أنا مساعد كيمو، كيف يمكنني مساعدتك اليوم في بئر العاتر؟";

  const storeInfo = stores.map(s => `${s.name} (قسم: ${s.category}, تقييم: ${s.rating})`).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        أنت "مساعد كيمو" الذكي في تطبيق توصيل بئر العاتر (الجزائر). 
        المتاجر المتاحة حالياً: [${storeInfo}].
        الزبون يسأل: "${userQuery}".
        أجب باختصار وبطريقة ودودة جداً باللهجة الجزائرية المفهومة. إذا سأل عن توصية، اقترح من المتاجر المتاحة فقط.
      `,
    });
    return response.text?.trim() || "أنا هنا لمساعدتك في طلباتك!";
  } catch (error) {
    return "عذراً، واجهت مشكلة بسيطة. جرب تسألني مرة أخرى!";
  }
};
