import dotenv from "dotenv";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const WebSocket = require("ws");
const wavefile = require("wavefile");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

const language = "en-US";


dotenv.config({ path: "../../.env"});

// speech config with keys
var pushStream = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1));
var speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_REGION);
var audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

speechConfig.speechRecognitionLanguage = language;
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

function writedata(data) {
  // if (isStreamHasbeenClosed) {
  //   // stream already closed don't need to write data
  //   return;
  // }
  const wav = new wavefile.WaveFile();
  wav.fromScratch(1, 8000, "8m", Buffer.from(data, "base64"));
  wav.fromMuLaw();
  wav.toSampleRate(8000);
  pushStream.write(wav.data.samples);
} 

recognizer.recognizing = (s, e) => {
    console.log(`RECOGNIZING: Text=${e.result.text}`);
};

recognizer.recognized = (s, e) => {
    if (e.result.reason == sdk.ResultReason.RecognizedSpeech) {
        console.log(`RECOGNIZED: Text=${e.result.text}`);
    }
    else if (e.result.reason == sdk.ResultReason.NoMatch) {
        console.log("NOMATCH: Speech could not be recognized.");
    }
};

recognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.reason}`);

    if (e.reason == sdk.CancellationReason.Error) {
        console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log("CANCELED: Did you update the key and location/region info?");
    }

    recognizer.stopContinuousRecognitionAsync();
};

recognizer.sessionStopped = (s, e) => {
    console.log("\n    Session stopped event.");
    recognizer.stopContinuousRecognitionAsync();
};

recognizer.startContinuousRecognitionAsync(() => {
    console.log("Continuous Reco Started");
},
    err => {
        console.trace("err - " + err);
        recognizer.close();
        recognizer = undefined;
    });
    

// Handle Web Socket Connection
wss.on("connection", function connection(ws) {
  console.log("New Connection Initiated");
  
     ws.on("message", function incoming(message) {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "connected":
          console.log(`A new call has connected.`);
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          break;
        case "media":
          // const audioBuffer = Buffer.from(msg.media.payload, "base64");
          writedata(msg.media.payload);
          
          break;
        case "stop":
          console.log(`Call Has Ended`);
          pushStream.close();
          break;
      }
    });
  
  });

//Handle HTTP Request
app.get("/", (req, res) => res.send("Hello World"));

app.post("/", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Start>
        <Stream url="wss://${req.headers.host}/"/>
      </Start>
      <Say>I will stream the next 60 seconds of audio through your websocket</Say>
      <Pause length="60" />
    </Response>
  `);
});

console.log("Listening at Port 8080");
server.listen(8080);