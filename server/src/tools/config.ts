import dotenv from "dotenv";
dotenv.config();

export const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
export const AZURE_REGION = process.env.AZURE_REGION;
export const O3_MINI_HIGH_API_URL = process.env.O3_MINI_HIGH_API_URL;
export const O3_MINI_HIGH_API_KEY = process.env.O3_MINI_HIGH_API_KEY;