import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
import WebSocket from "ws";
import { humeSentiService } from "./humeSentiService.js";
import pkg from "wavefile";
import { AZURE_SPEECH_KEY, AZURE_REGION } from "./tools/config.js";
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

export function startTranscription(httpServer: any, io: any) {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("connection", (ws) => {
    console.log("New Connection Initiated");

    // These variables are per-connection (or per-call)
    let pushStream: sdk.AudioInputStream | null = null;
    let recognizer: sdk.SpeechRecognizer | null = null;

    // Function to initialize the push stream and recognizer for the current call.
    function initializeRecognizer() {
      // Create a new push stream.
      pushStream = sdk.AudioInputStream.createPushStream(
        sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1)
      );

      // Create an audio configuration from the new push stream.
      const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

      // Create a new recognizer with our speech config and audio config.
      recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

      // Attach the interim (recognizing) event handler.
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
          const interimText = e.result.text;
          console.log(`INTERIM TRANSCRIPTION: ${interimText}`);
          // Emit the interim transcription event to the client.
          io.emit("interimTranscription", interimText);
        }
      };

      // Attach the final (recognized) event handler.
      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          const finalText = e.result.text;
          console.log(`FINAL TRANSCRIPTION: ${finalText}`);
          // Emit final transcription and (optionally) clear interim text on client.
          io.emit("finalTranscription", finalText);
          humeSentiService.sendTextData(finalText);
        } else if (e.result.reason === sdk.ResultReason.NoMatch) {
          console.log("NOMATCH: Speech could not be recognized.");
        }
      };

      recognizer.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);
        if (e.reason === sdk.CancellationReason.Error) {
          console.log(`CANCELED: ErrorCode=${e.errorCode}`);
          console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
          console.log("CANCELED: Did you update the key and location/region info?");
        }
        recognizer?.stopContinuousRecognitionAsync();
      };

      recognizer.sessionStopped = (s, e) => {
        console.log("Session stopped event.");
        recognizer?.stopContinuousRecognitionAsync();
      };

      // Start continuous recognition.
      recognizer.startContinuousRecognitionAsync(
        () => {
          console.log("Continuous Reco Started");
        },
        (err) => {
          console.trace("Error starting recognition:", err);
          recognizer?.close();
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
          // When a call starts, initialize the stream and recognizer if needed.
          if (!pushStream) {
            initializeRecognizer();
          }
          break;
        case "media":
          writeData(msg.media.payload);
          break;
        case "stop":
          console.log("Call Has Ended");
          // Stop the call: close the push stream and stop the recognizer.
          if (pushStream) {
            pushStream.close();
            pushStream = null;
          }
          if (recognizer) {
            recognizer.stopContinuousRecognitionAsync();
            recognizer = null;
          }
          break;
      }
    });
  });
}
