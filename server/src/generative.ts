import { transcriptionEmitter } from './tools/emitter.js';
import fetch from 'node-fetch';
import { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY } from './tools/config.js';
import { Server as SocketIOServer } from "socket.io";
import { predictionAccumulator } from './tools/predictionAccumulator.js';

let io: SocketIOServer;

export function initializeGenerative(socketIO: SocketIOServer) {
  io = socketIO;
  console.log("[generative.ts] Socket.IO initialized");
}

const promptTemplate = `You are a note-taking assistant.  
Based on the conversation below, identify the core events or facts, and for each one describe how the speaker felt at that moment.

Guidelines:
1. Only record information explicitly stated or very strongly implied.  
2. For each bullet, start with the event or fact, then add “— the speaker felt <emotion>.” based on the top three emotions you received with that text  
3. Keep each bullet concise (1-2 sentences).  
4. Do not add new details, assumptions, or trivial observations.  
5. Do not repeat the same point twice.  
6. If no meaningful information is present, reply:  
   “No key events or emotions identified.”

Conversation:
\n\n`;
const temperature = 0.7;
const maxTokens = 400;

let conversationHistory = "";
const MAX_HISTORY_LENGTH = 5000;

/**
 * Sends the prompt to Azure OpenAI API using chat completions.
 * @param prompt The complete prompt to send.
 */
async function callAzureOpenAI(prompt: string): Promise<any> {
  const payload = {
    messages: [
      { role: "user", content: prompt }
    ],
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch(AZURE_OPENAI_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_API_KEY!,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${errorText}`);
  }

  return response.json();
}

/**
 * Generates notes from the complete conversation transcript.
 * @param transcript The complete conversation transcript.
 */
async function generateNotes(transcript: string) {  
  // Create the full prompt using the complete transcript
  const prompt = promptTemplate + transcript;
  console.log("Generating notes from complete transcript");

  try {
    const notesResponse = await callAzureOpenAI(prompt);
    console.log("Generated Notes:", notesResponse);
    io.emit("notesGenerated", notesResponse);
  } catch (error) {
    console.error("Error generating notes:", error);
  }
}

// Listen for call ended events and generate notes
console.log("[generative.ts] Setting up callEnded listener (using accumulated text)");
transcriptionEmitter.on('callEnded', async () => {
  // Pull every snippet we’ve collected
  const records = predictionAccumulator.getRecords();
  // Build a single text blob
  const accumulatedText = records
    .map(r => r.text.trim())
    .filter(t => t.length > 0)
    .join('\n');

  console.log("[generative.ts] Sending accumulated text to Azure:",accumulatedText);
  await generateNotes(accumulatedText);

  predictionAccumulator.clear();
  console.log('[generative.ts] Cleared prediction accumulator after call end');
});

/**
 * Optionally, you might want to clear the conversation history at the end of a call.
 */
export function clearConversationHistory() {
  console.log("[clearConversationHistory] Clearing conversation history");
  conversationHistory = "";
}

export { generateNotes };