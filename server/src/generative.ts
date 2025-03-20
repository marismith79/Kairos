import { transcriptionEmitter } from './transcription.js';
import fetch from 'node-fetch';
import { O1_MINI_HIGH_API_URL, O1_MINI_HIGH_API_KEY } from './tools/config.js';
import { EventEmitter } from "events";
export const outputEmitter = new EventEmitter();

const model = "o1-mini";  
const promptTemplate = `You are a helpful conversational assistant. 
Please provide a friendly and thoughtful response that continues the conversation.
The user said:`;

const temperature = 1;
const maxTokens = 2000;

// This variable accumulates all transcriptions to provide context over time.
let conversationHistory = "";
const MAX_HISTORY_LENGTH = 5000;

/**
 * Sends the prompt to the o1-mini-high model API using chat completions.
 * @param prompt The complete prompt to send.
 */
async function callO1Model(prompt: string): Promise<any> {
  const payload = {
    model,
    messages: [
      { role: "user", content: prompt }
    ],
    temperature,
    max_completion_tokens: maxTokens,
  };

  const response = await fetch(O1_MINI_HIGH_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${O1_MINI_HIGH_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`O1 API error: ${errorText}`);
  }

  return response.json();
}

/**
 * Appends new transcription text to the conversation history,
 * then sends the full context to the model for output generation.
 * @param newText The latest transcribed text.
 */
async function handleTranscription(newText: string) {
  console.log("Appending new transcription to conversation history:", newText);
  conversationHistory += "\n" + newText;

  // Trim the conversation history if it exceeds the max length.
  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
  }

  // Create the full prompt using the accumulated conversation history.
  const prompt = promptTemplate + conversationHistory;
  console.log("Sending prompt to O1 Mini Model:", prompt);

  try {
    const outputResponse = await callO1Model(prompt);
    console.log("Generated Notes:", outputResponse);
    outputEmitter.emit("outputGenerated", outputResponse);
  } catch (error) {
    console.error("Error generating output:", error);
  }
}

// Listen for transcription events and handle them.
transcriptionEmitter.on('transcriptionReady', async (data: { processedText: string }) => {
  console.log("Received transcription event with text:", data.processedText);
  await handleTranscription(data.processedText);
});

/**
 * Optionally, you might want to clear the conversation history at the end of a call.
 */
export function clearConversationHistory() {
  console.log("Clearing conversation history.");
  conversationHistory = "";
}

export { handleTranscription };
