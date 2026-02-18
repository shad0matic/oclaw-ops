
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

const promptTemplate = `
Analyze this X/Twitter post and extract:
1. A 1-2 sentence summary
2. Key points (bullet list)
3. Topics/categories it belongs to
4. Any tools, products, or resources mentioned
5. Overall sentiment
6. Relevance score (1-10) for a tech founder

Post:
{text}

Author: {author}

Return the output as a JSON object with the following structure:
{
  "summary": "string",
  "keyPoints": ["string"],
  "topics": ["string"],
  "tools": ["string"],
  "sentiment": "positive" | "neutral" | "negative",
  "relevanceScore": "number"
}
`;

export async function extractText(text: string, author: string) {
  const prompt = promptTemplate.replace('{text}', text).replace('{author}', author);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const jsonText = response.text().replace('```json', '').replace('```', '').trim();
  
  return JSON.parse(jsonText);
}
