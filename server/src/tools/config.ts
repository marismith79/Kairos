import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
dotenv.config();

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
export const AZURE_REGION = process.env.AZURE_REGION;
export const O1_MINI_HIGH_API_URL = process.env.O1_MINI_HIGH_API_URL;
export const O1_MINI_HIGH_API_KEY = process.env.O1_MINI_HIGH_API_KEY;
export const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
export const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;

export const speechConfig = initializeSpeechConfig();

export function initializeSpeechConfig() {
  const config = sdk.SpeechConfig.fromSubscription(
    AZURE_SPEECH_KEY!,
    AZURE_REGION!
  );
  config.speechRecognitionLanguage = "en-US";
  config.setProperty("DiarizationEnabled", "true");
  // ... other config settings
  return config;
}
