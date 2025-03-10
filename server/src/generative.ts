import { transcriptionEmitter } from './transcription.js';
import fetch from 'node-fetch';
import { O3_MINI_HIGH_API_URL, O3_MINI_HIGH_API_KEY } from './tools/config.js';
import { EventEmitter } from "events";
export const notesEmitter = new EventEmitter();

// Configuration parameters for the model
const model = "o1-mini";  
const promptTemplate = `
Based on the following conversation, generate a JSON object of important notes. 
The JSON should have a single key "notes" which is an array of note objects. 
Each note object must have a "title" and a "content". 
If a note already exists, update its "content" with any new relevant information rather than adding a duplicate.
Ensure the output is strictly JSON.

Conversation:
`;
const temperature = 1;
const maxTokens = 450;

// This variable accumulates all transcriptions to provide context over time.
let conversationHistory = "";

// Limit the accumulated context length to prevent overly long prompts.
const MAX_HISTORY_LENGTH = 5000;

/**
 * Sends the prompt to the o3-mini-high model API using chat completions.
 * @param prompt The complete prompt to send.
 */
async function callO3MiniModel(prompt: string): Promise<any> {
  const payload = {
    model,
    messages: [
      { role: "user", content: prompt }
    ],
    temperature,
    max_completion_tokens: maxTokens,
  };

  const response = await fetch(O3_MINI_HIGH_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${O3_MINI_HIGH_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`O3 Mini API error: ${errorText}`);
  }

  return response.json();
}

/**
 * Appends new transcription text to the conversation history,
 * then sends the full context to the model for note generation.
 * @param newText The latest transcribed text.
 */
async function handleTranscription(newText: string) {
  // Append the latest transcription with a newline separator.
  conversationHistory += "\n" + newText;

  // Trim the conversation history if it exceeds the max length.
  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
  }

  // Create the full prompt using the accumulated conversation history.
  const prompt = promptTemplate + conversationHistory;
  console.log("Sending prompt to O3 Mini Model:", prompt);

  try {
    const notesResponse = await callO3MiniModel(prompt);
    console.log("Generated Notes:", notesResponse);
    notesEmitter.emit("notesGenerated", notesResponse);
    // Here we could emit an event, stream the notes to a client via websockets, or integrate into your UI.
  } catch (error) {
    console.error("Error generating notes:", error);
  }
}

// Listen for transcription events and handle them.
// This assumes your event emits an object with a 'processedText' property.
transcriptionEmitter.on('transcriptionReady', async (data: { processedText: string }) => {
  await handleTranscription(data.processedText);
});

/**
 * Optionally, you might want to clear the conversation history at the end of a call.
 */
export function clearConversationHistory() {
  conversationHistory = "";
}

export { handleTranscription };
