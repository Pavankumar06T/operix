require('dotenv').config();
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

async function test() {
  const m = new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.3
  });

  const systemPrompt = `
    You are an expert Project Manager AI. Break down the following project description into 3-6 actionable tasks.
    You MUST respond with raw JSON matching this structure perfectly. NO markdown blocks.
    [
      {
        "title": "Task title",
        "description": "Task description",
        "priority": "high" | "medium" | "low",
        "estimated_hours": 10
      }
    ]
  `

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage("Project Description: A highly scalable AI/ML pipeline designed to analyze real-time IoT sensor data from industrial machinery.")
  ]

  const responseString = (await m.invoke(messages)).content.toString();
  console.log("=== RAW ===");
  console.log(responseString);
  console.log("=== PARSED ===");
  try {
    let jsonString = responseString.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/```json/, '').replace(/```$/, '').trim()
    }
    const tasks = JSON.parse(jsonString);
    console.log(tasks);
  } catch(e) {
    console.error("PARSE ERROR:", e.message);
  }
}
test();
