import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey: string = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('[Gemini] Missing GEMINI_API_KEY in environment variables');
}

export const geminiModel = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey,
  temperature: 0.3,
  maxOutputTokens: 1500,
});

export const geminiReportModel = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey,
  temperature: 0.4,
  maxOutputTokens: 2000,
});

export default geminiModel;
