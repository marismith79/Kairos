import { transcriptionEmitter } from './tools/emitter.js';
import fetch from 'node-fetch';
import { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY } from './tools/config.js';
import { Server as SocketIOServer } from "socket.io";
import { isObjectBindingPattern } from 'typescript';

let io: SocketIOServer;

export function initializeGenerative(socketIO: SocketIOServer) {
  io = socketIO;
  console.log("[generative.ts] Socket.IO initialized");
}

const promptTemplate = `Based on the following conversation, generate ONLY key information points that are explicitly mentioned or strongly implied. 
Rules:
1. Only include information that is clearly present in the conversation
2. Do not make assumptions or inferences
3. Keep each point brief and specific
4. Do not include redundant information
5. Do not include obvious or trivial observations
6. Format as a simple bulleted list without sections or headers
7. If no meaningful information is present, simply respond with "No key information points identified."

Conversation:\n\n`;
const temperature = 0.7;
const maxTokens = 200;

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
console.log("[generative.ts] Setting up callEnded listener");
transcriptionEmitter.on('callEnded', async (data: { completeTranscript: string }) => {
  console.log("[generative.ts] Received callEnded event with complete transcript");
  await generateNotes(data.completeTranscript);
});

/**
 * Optionally, you might want to clear the conversation history at the end of a call.
 */
export function clearConversationHistory() {
  console.log("[clearConversationHistory] Clearing conversation history");
  conversationHistory = "";
}

export { generateNotes };