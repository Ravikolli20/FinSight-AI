
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction } from "../types";

const apiKey = process.env.API_KEY || '';

/**
 * Analyzes an image (receipt/screenshot) and extracts transaction data.
 */
export const analyzeReceiptImage = async (base64Image: string): Promise<Partial<Transaction>> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The total amount of the transaction." },
      date: { type: Type.STRING, description: "The date of transaction in YYYY-MM-DD format." },
      merchant: { type: Type.STRING, description: "Name of the store or person paid." },
      category: { type: Type.STRING, description: "Inferred category (e.g., Food, Travel, Shopping, Bills)." },
      method: { type: Type.STRING, description: "Payment method if visible (cash, upi, card). Default to upi if unsure but looks digital." },
    },
    required: ["amount", "merchant", "category"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analyze this receipt or screenshot. Extract the total amount, date, merchant name, and infer the category. If the date is missing, use today's date. Guess the payment method (UPI/Cash) if indicated.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
    
    return {
      amount: data.amount,
      date: data.date || new Date().toISOString().split('T')[0],
      description: data.merchant,
      category: data.category,
      method: (['cash', 'upi', 'bank', 'credit_card'].includes(data.method?.toLowerCase()) ? data.method.toLowerCase() : 'upi') as any,
      type: 'expense'
    };
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw error;
  }
};

/**
 * Financial Advisor Chat
 */
export const askFinancialAdvisor = async (
  history: { role: 'user' | 'model'; text: string }[],
  currentMessage: string,
  financialContext: Transaction[]
): Promise<string> => {
  if (!apiKey) return "Please set your API Key to use the AI assistant.";

  const ai = new GoogleGenAI({ apiKey });
  const recentTransactions = financialContext.slice(0, 100);
  const contextString = JSON.stringify(recentTransactions);

  const systemInstruction = `You are SmartFinance AI, a helpful and friendly personal accountant. 
  You have access to the user's recent financial transactions provided in JSON format below. 
  
  Current Transaction Data:
  ${contextString}
  
  Answer the user's questions about their spending, savings, and habits based on this data. 
  - Be concise and insightful.
  - If asked about totals, calculate them from the provided data.
  - Format numbers as currency (₹).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: currentMessage,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "I couldn't process that request.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting to my brain right now. Please try again later.";
  }
};

/**
 *  Predict next month expenses (Simple forecasting via LLM logic)
 */
export const predictNextMonth = async (transactions: Transaction[]): Promise<string> => {
  if (!apiKey) return "API Key required";

  const ai = new GoogleGenAI({ apiKey });
  const categoryTotals: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const prompt = `
    Based on the following expense totals by category for this month: ${JSON.stringify(categoryTotals)},
    predict the estimated budget needed for next month.
    Return a short JSON object with:
    { "predictedTotal": number, "insight": string }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  return response.text || "";
};
