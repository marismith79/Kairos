import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
import WebSocket from "ws";
import { humeSentiService } from "./humeSentiService.js";
import pkg from "wavefile";
import { AZURE_SPEECH_KEY, AZURE_REGION } from "./tools/config.js";
const { WaveFile } = pkg;

const language = "en-US";
const pushStream = sdk.AudioInputStream.createPushStream(
  sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1)
);

if (!AZURE_SPEECH_KEY || !AZURE_REGION) {
    throw new Error("Missing required Azure configuration.");
  }

const speechConfig = sdk.SpeechConfig.fromSubscription(
    AZURE_SPEECH_KEY!, 
    AZURE_REGION!
);
const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

speechConfig.speechRecognitionLanguage = language;
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

export function startTranscription(httpServer: any, io: any) {
  const wss = new WebSocket.Server({ server: httpServer });
  
  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });
  
  wss.on("connection", (ws) => {
    console.log("New Connection Initiated");

    ws.on("error", (error) => {
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
          break;
        case "media":
          writeData(msg.media.payload);
          break;
        case "stop":
          console.log("Call Has Ended");
          pushStream.close();
          break;
      }
    });
  });

  recognizer.recognized = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
      const finalText = e.result.text;
      console.log(`FINAL TRANSCRIPTION: ${finalText}`);
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
    recognizer.stopContinuousRecognitionAsync();
  };

  recognizer.sessionStopped = (s, e) => {
    console.log("Session stopped event.");
    recognizer.stopContinuousRecognitionAsync();
  };

  function writeData(data: string) {
    const wav = new WaveFile();
    wav.fromScratch(1, 8000, "8m", Buffer.from(data, "base64"));
    wav.fromMuLaw();
    wav.toSampleRate(8000);
    pushStream.write((wav.data as any).samples);
  }

  // Start continuous recognition.
  recognizer.startContinuousRecognitionAsync(
    () => {
      console.log("Continuous Reco Started");
    },
    err => {
      console.trace("Error starting recognition:", err);
      recognizer.close();
    }
  );
}
