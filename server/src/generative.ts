import { sharedEmitter } from './tools/emitter.js';
import fetch from 'node-fetch';
import { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY } from './tools/config.js';
import { Server as SocketIOServer } from "socket.io";

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
4. Do not include redundant or duplicate information
5. Do not include obvious or trivial observations
6. Format as a simple bulleted list without sections or headers
7. If no meaningful information is present, simply respond with "No key information points identified."

Conversation:\n\n`;
const temperature = 0.7;
const maxTokens = 200;

let conversationHistory = "";
const MAX_HISTORY_LENGTH = 5000;

/**
 * Cleans and formats the generated notes to remove redundancy and improve readability.
 * @param notes The raw notes string to clean.
 * @returns A cleaned and formatted version of the notes.
 */
function cleanGeneratedNotes(notes: string): string {
  // Remove empty lines
  const lines = notes.split('\n').filter(line => line.trim());
  
  // Remove redundant information
  const uniqueLines = [...new Set(lines)];
  
  // Join back with proper formatting
  return uniqueLines.join('\n');
}

/**
 * Determines if the new text contains enough meaningful content to generate notes.
 * @param newText The new transcription text to evaluate.
 * @returns boolean indicating whether notes should be generated.
 */
function shouldGenerateNotes(newText: string): boolean {
  // Only generate notes if the new text adds meaningful information
  const meaningfulThreshold = 20; // Minimum characters for meaningful content
  return newText.length > meaningfulThreshold;
}

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

  console.log("[callAzureOpenAI] Successfully received response from API");
  return response.json();
}

/**
 * Appends new transcription text to the conversation history,
 * then sends the full context to the model for note generation.
 * @param newText The latest transcribed text.
 */
async function handleTranscription(newText: string) {
  console.log("[handleTranscription] Received new transcription text:", newText);
  
  // Check if the new text is meaningful enough to generate notes
  if (!shouldGenerateNotes(newText)) {
    console.log("[handleTranscription] Text too short, skipping note generation");
    return;
  }
  
  // Append the latest transcription with a newline separator.
  conversationHistory += "\n" + newText;
  console.log("[handleTranscription] Updated conversation history length:", conversationHistory.length);

  // Trim the conversation history if it exceeds the max length.
  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    console.log("[handleTranscription] Trimming conversation history to max length...");
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
    console.log("[handleTranscription] New conversation history length:", conversationHistory.length);
  }

  // Create the full prompt using the accumulated conversation history.
  const prompt = promptTemplate + conversationHistory;
  console.log("[handleTranscription] Created full prompt for note generation");

  try {
    console.log("[handleTranscription] Calling Azure OpenAI API for note generation...");
    const notesResponse = await callAzureOpenAI(prompt);
    console.log("[handleTranscription] Generated Notes Response:", notesResponse);
    
    // Clean the generated notes before emitting
    const cleanedNotes = cleanGeneratedNotes(notesResponse.choices[0].message.content);
    console.log("[handleTranscription] Cleaned notes:", cleanedNotes);
    
    console.log("[handleTranscription] Emitting notes to clients...");
    if (io) {
      io.emit("notesGenerated", { choices: [{ message: { content: cleanedNotes } }] });
    } else {
      console.error("[handleTranscription] Socket.IO not initialized");
    }
  } catch (error) {
    console.error("[handleTranscription] Error generating notes:", error);
  }
}

// Listen for transcription events and handle them.
console.log("[generative.ts] Setting up transcriptionReady listener");
sharedEmitter.on('transcriptionReady', async ( data: { finalText: string } ) => {
  console.log("[generative.ts] Received transcriptionReady event with data:", data);
  await handleTranscription(data.finalText);
});

/**
 * Optionally, you might want to clear the conversation history at the end of a call.
 */
export function clearConversationHistory() {
  console.log("[clearConversationHistory] Clearing conversation history");
  conversationHistory = "";
}

export { handleTranscription };