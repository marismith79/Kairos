import WebSocket from "ws";
import pkg from "wavefile"
import { O1_MINI_HIGH_API_KEY } from './tools/config.js';
import { writeFileSync, createReadStream, unlinkSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import FormData from "form-data";
import axios from "axios";
import { EventEmitter } from "events";
import { clearConversationHistory } from "./generative.js";
const { WaveFile } = pkg;

export const transcriptionEmitter = new EventEmitter();

// Start the transcription service that uses OpenAI Whisper.
export function startTranscription(httpServer: any, io: any) {
  const wss = new WebSocket.Server({ server: httpServer });
  
  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });
  
  wss.on("connection", (ws) => {
    console.log("New Connection Initiated");
    // Array to accumulate incoming audio chunks.
    let audioChunks: Uint8Array[] = [];
    
    ws.on("error", (error) => {
      console.error("WebSocket connection error:", error);
    });
    
    ws.on("message", async (message: string) => {
      const msg = JSON.parse(message);
      switch (msg.event) {
        case "connected":
          console.log("A new call has connected.");
          io.emit("resetChat");
          break;
        case "start":
          console.log(`Starting Media Stream ${msg.streamSid}`);
          break;
        case "media":
          console.log("Received audio chunk. Base64 length:", msg.media.payload.length);
          const wav = new WaveFile();
          const buf = Buffer.from(msg.media.payload, "base64");
          wav.fromScratch(1, 8000, "8m", buf);
          wav.fromMuLaw();           
          wav.toBitDepth("16");      
          wav.toSampleRate(8000);    
          const pcmBuffer: Buffer = (wav.data as { samples: Buffer }).samples;
          const pcmChunk = new Uint8Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength);
          // console.log("Processed chunk length (bytes):", pcmChunk.length);
          audioChunks.push(pcmChunk);
          break;
          case "vad":
            // Client-side VAD event: if status indicates silence, flush audio. 
            if (msg.status === "silence") {
              // console.log("Client VAD indicates silence. Flushing audio...");
              await flushAudio();
            }
            break;
          case "stop":
            console.log("Call Has Ended");
            // await flushAudio();
            clearConversationHistory();
            break;
          default:
            break;
        }
  
        async function flushAudio() {
          const finalBuffer = Buffer.concat(audioChunks as readonly Uint8Array[]);
          console.log("Final audio buffer length:", finalBuffer.length);
          if (finalBuffer.length < 1000) {
            console.log("Audio buffer is empty. Ignoring VAD event.");
            audioChunks = [];
            return;
          }
          
          const wav = new WaveFile();
          wav.fromScratch(1, 8000, '16', finalBuffer);
          const wavBuffer = wav.toBuffer();
        
          // Write the WAV buffer to a temporary file.
          const tempFilename = `/tmp/${uuidv4()}.wav`;
          writeFileSync(tempFilename, wavBuffer);
          console.log(`Debug URL: http://localhost:3000/debug/${tempFilename}`);
          
          
          try {
            writeFileSync(tempFilename, wavBuffer);
            const transcription = await transcribeWithWhisper(tempFilename);
            console.log("Whisper transcription:", transcription);
            io.emit("finalTranscription", transcription);
            transcriptionEmitter.emit("transcriptionReady", { processedText: transcription });
          } catch (err) {
            console.error("Error transcribing with Whisper:", err);
          } finally {
            try {
              unlinkSync(tempFilename);
              console.log(`Temporary file ${tempFilename} deleted.`);
            } catch (cleanupErr) {
              console.error("Error cleaning up temporary file:", cleanupErr);
            }
          }
          // Reset the audio buffer for the next session.
          audioChunks = [];
        }        
    });
  });
}

/**
 * Transcribe the audio file at the given file path using OpenAI's Whisper API.
 * Returns the transcribed text.
 */
async function transcribeWithWhisper(filePath: string): Promise<string> {
  const form = new FormData();
  form.append("file", createReadStream(filePath));
  form.append("model", "whisper-1");
  
  const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
    headers: {
      ...form.getHeaders(),
      "Authorization": `Bearer ${O1_MINI_HIGH_API_KEY}`,
    },
  });
  
  // The API response should contain a 'text' field with the transcription.
  return response.data.text;
}