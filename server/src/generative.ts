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

const promptTemplate = `You are a note-taking assistant helping counselors summarize crisis support calls.
Based on the conversation below, extract key information that would be needed for a post-call documentation in a CRM.

Guidelines:
1. Only record information that is explicitly stated or very strongly implied by the speaker.
2. Summarize notes in clear, separate bullet points. For each point:
    - Start with the event, concern, or fact.
    - Include the most relevant emotion experienced by the speaker, based on the top three detected emotions, placed naturally in the sentence.
3. Focus especially on identifying:
    - Demographic info related to the caller (e.g. name, age, hometowm, education, etc.)
    - Presenting problem(s) or concern(s).
    - Expressions of emotional state or risk (e.g., distress, hopelessness, calmness).
    - Support, interventions, or resources discussed.
    - Resolution or current status at the end of the conversation.
    - Any safety planning, referrals, or follow-up arrangements mentioned.
4. Keep each bullet point concise and specific (ideally 1-2 sentences).
5. Do not invent details, make assumptions, or include trivial observations.
6. Do not repeat the same information in different words.
7. If no meaningful information is found, reply only with:
   “No key events or emotions identified.”

Conversation:
\n\n`;
const temperature = 0.7;
const maxTokens = 400;

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
  .map(r => {
    const cleanedText = r.text.trim();
    const emotionNames = r.topEmotions.map(e => e.name).join(", ");
    return `${cleanedText} (Top emotions: ${emotionNames})`;
  })
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
}

export { generateNotes };