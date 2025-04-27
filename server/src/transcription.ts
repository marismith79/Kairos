/**
 * Azure Based Speech-to-Text Transcription Service
 *
 * This file implements real-time speech transcription with speaker diarization using Azure Cognitive Services.
 * It handles WebSocket connections for audio streaming and manages the transcription process with the following features:
 *
 * Key functionalities:
 * - Real-time speech-to-text conversion
 * - Speaker identification (diarization) between two speakers
 * - Interim and final transcription results
 * - Message bubble management for chat-like interface
 * - Integration with Hume sentiment analysis service
 *
 * Flow:
 * 1. Receives audio stream via WebSocket from Twilio conference call
 * 2. Processes audio through Azure Speech SDK
 * 3. Identifies speakers and transcribes speech
 * 4. Emits events for:
 *    - Start of new transcription
 *    - Interim updates
 *    - Final transcription results
 *
 * Events emitted:
 * - startTranscription: New speech segment detected
 * - interimTranscription: Real-time updates
 * - finalTranscription: Completed transcription
 *
 * Configuration:
 * - Uses Azure Speech Services credentials from environment
 * - Configured for 2-speaker diarization
 * - Processes 8kHz, 16-bit mono audio
 *
 * @requires microsoft-cognitiveservices-speech-sdk
 * @requires socket.io
 * @requires wavefile
 * @requires twilio 
 */
// reference docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speaker-recognition-overview
import dotenv from "dotenv";
import { WebSocketHandler } from "./WebSocketHandler.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

// Configure environment
dotenv.config();

/**
 * Starts the transcription service by initializing the WebSocketHandler
 * which manages WebSocket connections from Twilio conference calls.
 * 
 * The WebSocketHandler uses the TranscriptionManager to process audio data
 * and generate transcriptions, and the TwilioHandler to manage call details.
 * 
 * @param httpServer - The HTTP server instance to attach the WebSocket server to
 * @param io - The Socket.IO server instance for emitting events to clients
 */
export function startTranscription(httpServer: http.Server, io: SocketIOServer): void {
  console.log("Starting transcription service...");
  
  // Initialize the WebSocketHandler with the HTTP server and Socket.IO instance
  // This will set up WebSocket connections to receive audio from Twilio
  const webSocketHandler = new WebSocketHandler(httpServer, io);
  
  console.log("Transcription service started successfully");
  console.log("Ready to receive audio from Twilio conference calls via WebSocket");
}

