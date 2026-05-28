// ═══════════════════════════════════════════════════════
// B2: Gemini AI Client — LangChain Integration
// ═══════════════════════════════════════════════════════

import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  type BaseMessage,
} from '@langchain/core/messages'

export { HumanMessage, SystemMessage, AIMessage }
export type { BaseMessage }

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Gemini] ⚠️  Missing GEMINI_API_KEY — AI features will be unavailable')
}

/**
 * Chat model for interactive AI assistant conversations.
 * Lower temperature for factual, context-based responses.
 */
export const geminiChat = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY ?? '',
  temperature: 0.3,
  maxOutputTokens: 1500,
})

/**
 * Report model for generating weekly reports.
 * Slightly higher temperature for more natural writing style.
 */
export const geminiReport = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY ?? '',
  temperature: 0.4,
  maxOutputTokens: 2000,
})

/**
 * Invoke a Gemini model with a list of messages.
 * Handles errors gracefully and logs token usage in dev.
 *
 * @param messages - Array of LangChain message objects
 * @param model - Which Gemini instance to use (default: chat)
 * @returns The AI response content as a string
 */
export const callGemini = async (
  messages: BaseMessage[],
  model: ChatGoogleGenerativeAI = geminiChat
): Promise<string> => {
  try {
    const response = await model.invoke(messages)
    const content = response.content.toString()

    if (process.env.NODE_ENV === 'development') {
      const tokens = response.usage_metadata?.total_tokens ?? 'unknown'
      console.log(`[Gemini] ✅ Response generated (${tokens} tokens)`)
    }

    return content
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Gemini] ❌ API error:', errorMessage)
    throw new Error('AI service temporarily unavailable. Please try again.')
  }
}
