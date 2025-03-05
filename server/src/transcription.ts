import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import dotenv from "dotenv";
import WebSocket from "ws";
import pkg from "wavefile";
const { WaveFile } = pkg;

const language = "en-US";
const pushStream = sdk.AudioInputStream.createPushStream(
  sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1)
);


const speechConfig = sdk.SpeechConfig.fromSubscription(
  process.env.AZURE_SPEECH_KEY!,
  process.env.AZURE_REGION!
);
const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

speechConfig.speechRecognitionLanguage = language;
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

// Set up the event handlers as before...
recognizer.recognizing = (s, e) => {
    console.log(`RECOGNIZING: Text=${e.result.text}`);
};

recognizer.recognized = (s, e) => {
    if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
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

// Function to process incoming audio data
function writeData(data: string) {
  const wav = new WaveFile();
  // Create a WaveFile from the base64 encoded string and convert it as needed.
  wav.fromScratch(1, 8000, "8m", Buffer.from(data, "base64"));
  wav.fromMuLaw();
  wav.toSampleRate(8000);
  pushStream.write((wav.data as any).samples);

}

// Exported function that takes an HTTP server and attaches WebSocket handling
export function startTranscription(httpServer: any) {
  // Create a WebSocket server attached to the provided HTTP server.
  const wss = new WebSocket.Server({ server: httpServer });
  
  wss.on("connection", (ws) => {
    console.log("New Connection Initiated");
    
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
