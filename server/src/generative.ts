import { transcriptionEmitter } from './transcription.js';
import fetch from 'node-fetch';
import { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY } from './tools/config.js';
import { EventEmitter } from "events";
export const notesEmitter = new EventEmitter();

const promptTemplate = "Based on the following conversation, generate important notes highlighting key information points: \n\n";
const temperature = 1;
const maxTokens = 450;

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
  console.log("Sending prompt to Azure OpenAI:", prompt);

  try {
    const notesResponse = await callAzureOpenAI(prompt);
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