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
 * 1. Receives audio stream via WebSocket
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
 */
// reference docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speaker-recognition-overview
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
import WebSocket from "ws";
import { EventEmitter } from "events";
import { humeSentiService } from "./humeSentiService.js";
import pkg from "wavefile";
import { AZURE_SPEECH_KEY, AZURE_REGION } from "./tools/config.js";
export const transcriptionEmitter = new EventEmitter();
const { WaveFile } = pkg;

dotenv.config();

const language = "en-US";

if (!AZURE_SPEECH_KEY || !AZURE_REGION) {
  throw new Error("Missing required Azure configuration.");
}

const speechConfig = sdk.SpeechConfig.fromSubscription(
  AZURE_SPEECH_KEY,
  AZURE_REGION
);
speechConfig.speechRecognitionLanguage = language;
// Enable speaker diarization using setProperty
speechConfig.setProperty(
  "SpeechServiceConnection_ConversationTranscriptionInRoomAndOnline",
  "true"
);
speechConfig.setProperty("DiarizationEnabled", "true");
// Optionally set number of speakers (default is 2)
speechConfig.setProperty("DiarizationMinimumSpeakerCount", "2");
speechConfig.setProperty("DiarizationMaximumSpeakerCount", "2");


export function startTranscription(httpServer: any, io: any) {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("connection", (ws) => {
    console.log("New Connection Initiated");

    // These variables are per-connection (or per-call)
    let pushStream: sdk.AudioInputStream | null = null;
    let transcriber: sdk.ConversationTranscriber | null = null;

    // Function to initialize the push stream and transcriber for the current call.
    function initializeTranscriber() {
      // Create a new push stream.
      pushStream = sdk.AudioInputStream.createPushStream(
        sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1)
      );

      // Create an audio configuration from the new push stream.
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create a new transcriber with our speech config and audio config.
      transcriber = new sdk.ConversationTranscriber(speechConfig, audioConfig);

      // Define the interface
      interface SpeakingState {
        speakerId: string;
        lastUpdateTime: number;
        isActive: boolean;
        currentBubbleId: string; // Track current bubble ID
      }

      let currentSpeakingState: SpeakingState = {
        speakerId: "",
        lastUpdateTime: Date.now(),
        isActive: false,
        currentBubbleId: "",
      };

      // Handle real-time updates while someone is speaking
      transcriber.transcribing = (s, e) => {
        if (e.result) {
          const interimText = e.result.text;
          const currentTime = Date.now();
      
          // Generate new bubble ID
          const newBubbleId = `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
          if (!currentSpeakingState.isActive || 
              currentTime - currentSpeakingState.lastUpdateTime > 1500) {
            
            // Update speaking state
            currentSpeakingState = {
              speakerId: e.result.speakerId || 'Speaker1', // Fallback to default speaker
              lastUpdateTime: currentTime,
              isActive: true,
              currentBubbleId: newBubbleId
            };
      
            io.emit("startTranscription", {
              bubbleId: newBubbleId,
              speakerId: currentSpeakingState.speakerId,
              text: interimText,
              isInterim: true,
              timestamp: new Date().toISOString()
            });
          } else {
            // Update existing bubble
            currentSpeakingState.lastUpdateTime = currentTime;
            
            io.emit("interimTranscription", {
              bubbleId: currentSpeakingState.currentBubbleId,
              speakerId: currentSpeakingState.speakerId,
              text: interimText,
              isInterim: true,
              timestamp: new Date().toISOString()
            });
          }
        }
      };
      
      // Revert back to the working version of transcribed event
      transcriber.transcribed = (s, e) => {
        if (e.result) {
          const finalText = e.result.text;
          const speakerId = e.result.speakerId;
          
          console.log(`FINAL (Speaker ${speakerId}): ${finalText}`);
          
          const transcriptionData = {
            bubbleId: currentSpeakingState.currentBubbleId,
            finalBubbleId: `final-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: finalText,
            speakerId: speakerId,
            isInterim: false,
            timestamp: new Date().toISOString()
          };
      
          io.emit("finalTranscription", transcriptionData);
          
          // Send to Hume
          humeSentiService.sendTextData(finalText);
      
          // Reset speaking state
          currentSpeakingState = {
            speakerId: '',
            lastUpdateTime: Date.now(),
            isActive: false,
            currentBubbleId: ''
          };
        }
      };

      transcriber.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);
        if (e.reason === sdk.CancellationReason.Error) {
          console.log(`CANCELED: ErrorCode=${e.errorCode}`);
          console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
          console.log(
            "CANCELED: Did you update the key and location/region info?"
          );
        }
        transcriber?.stopTranscribingAsync();
      };

      transcriber.sessionStopped = (s, e) => {
        console.log("Session stopped event.");
        transcriber?.stopTranscribingAsync();
      };

      // Start continuous recognition.
      transcriber.startTranscribingAsync(
        () => {
          console.log("Continuous Reco Started");
        },
        (err) => {
          console.trace("Error starting recognition:", err);
          transcriber?.close();
        }
      );
    }

    // Helper function to write media data into the push stream.
    function writeData(data: string) {
      if (!pushStream) return;
      const wav = new WaveFile();
      // Create a wave file from the incoming data.
      wav.fromScratch(1, 8000, "8m", Buffer.from(data, "base64"));
      wav.fromMuLaw();
      wav.toSampleRate(8000);
      // Write the decoded samples to the push stream.
      (pushStream as sdk.PushAudioInputStream).write((wav.data as any).samples);
    }

    ws.on("error", (error) => {
      if (error && (error as any).code === "WS_ERR_INVALID_CLOSE_CODE") {
        console.warn("Ignoring invalid close code error (1002)");
        return;
      }
      console.error("WebSocket connection error:", error);
    });

    ws.on("message", (message: string) => {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "connected":
          console.log("A new call has connected.");
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          // When a call starts, initialize the stream and transcriber if needed.
          if (!pushStream) {
            initializeTranscriber();
          }
          3;
          break;
        case "media":
          writeData(msg.media.payload);
          break;
        case "stop":
          console.log("Call Has Ended");
          // Stop the call: close the push stream and stop the transcriber.
          if (pushStream) {
            pushStream.close();
            pushStream = null;
          }
          if (transcriber) {
            transcriber.stopTranscribingAsync();
            transcriber = null;
          }
          break;
      }
    });
  });
}
