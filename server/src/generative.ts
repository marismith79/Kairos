import { transcriptionEmitter } from './transcription.js';
import fetch from 'node-fetch';
import { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY } from './tools/config.js';
import { EventEmitter } from "events";
export const outputEmitter = new EventEmitter();

// Prompt template for generating responses.
const promptTemplate = `You are a company cofounder who is trying to strategize on a new business opportunity.
Please provide a friendly and thoughtful response that continues the conversation.
The user said:`;

// Settings for the Azure OpenAI API.
const temperature = 1;
const maxTokens = 2000;

// Accumulates conversation context.
let conversationHistory = "";
const MAX_HISTORY_LENGTH = 5000;

function getAzureEndpointUrl(): string {
  // return `${AZURE_OPENAI_ENDPOINT}`;
  return 'null'; // CHANGE THIS WHEN YOU DEBUG THE TRANSCRIPTION
}

async function callAzureModel(prompt: string): Promise<any> {
  // console.log("[Generative] Calling Azure OpenAI model with prompt:", prompt);
  const payload = {
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  };

  const url = getAzureEndpointUrl();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": AZURE_OPENAI_API_KEY || "",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Generative] Azure OpenAI API error: ${errorText}`);
  }
  // console.log("[Generative] Received response from Azure OpenAI.");
  return response.json();
}

async function handleTranscription(newText: string) {
  console.log("[Generative] Received new transcription:", newText);
  conversationHistory += "\n" + newText;

  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
  }

  const prompt = promptTemplate + conversationHistory;
  // console.log("[Generative] Sending prompt to Azure OpenAI model:", prompt);

  try {
    const outputResponse = await callAzureModel(prompt);
    outputEmitter.emit("outputGenerated", outputResponse);
  } catch (error) {
    console.error("[Generative] Error generating output:", error);
  }
}

transcriptionEmitter.on("transcriptionReady", async (data: { processedText: string }) => {
  console.log("[Generative] Transcription event received with text:", data.processedText);
  await handleTranscription(data.processedText);
});

export function clearConversationHistory() {
  console.log("[Generative] Clearing conversation history.");
  conversationHistory = "";
}

export { handleTranscription };
