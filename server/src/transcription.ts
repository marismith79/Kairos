import WebSocket from "ws";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { O1_MINI_HIGH_API_KEY } from "./tools/config.js";
import { writeFileSync, createReadStream, unlinkSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import FormData from "form-data";
import axios from "axios";
import { EventEmitter } from "events";
import { clearConversationHistory } from "./generative.js";

if (ffmpegPath === null) {
  throw new Error("ffmpeg path is null");
}
ffmpeg.setFfmpegPath(ffmpegPath);

export const transcriptionEmitter = new EventEmitter();

// Ensure that the API key is a non-null string.
const API_KEY: string = O1_MINI_HIGH_API_KEY!;
if (!API_KEY) {
  throw new Error("API key is missing");
}

export function startTranscription(httpServer: any, io: any): void {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on("error", (error: Error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New Connection Initiated");
    // Array to accumulate incoming audio chunks.
    let audioChunks: Uint8Array[] = [];

    ws.on("error", (error: Error) => {
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
          const buf = Buffer.from(msg.media.payload, "base64");
          // The incoming data is assumed to be in webm container format.
          if (buf.length > 0) {
            audioChunks.push(new Uint8Array(buf));
          }
          break;
        case "vad":
          // Client-side VAD event: if status indicates silence, flush audio.
          if (msg.status === "silence") {
            await flushAudio();
          }
          break;
        case "stop":
          console.log("Call Has Ended");
          clearConversationHistory();
          break;
        default:
          break;
      }

      async function flushAudio(): Promise<void> {
        const finalBuffer = Buffer.concat(audioChunks);
        console.log("Final audio buffer length:", finalBuffer.length);
        if (finalBuffer.length < 100) {
          console.log("Audio buffer is empty. Ignoring VAD event.");
          audioChunks = [];
          return;
        }

        // Write the aggregated WebM data to a temporary file.
        const tempWebmFilename: string = `/tmp/${uuidv4()}.webm`;
        writeFileSync(tempWebmFilename, finalBuffer as unknown as Uint8Array);

        // Define a temporary filename for the converted WAV file.
        const tempWavFilename: string = `/tmp/${uuidv4()}.wav`;

        try {
          // Convert the .webm file to a .wav file (raw PCM) using FFmpeg.
          await convertWebmToWav(tempWebmFilename, tempWavFilename);
          // Transcribe the converted WAV file using Whisper API.
          const transcription = await transcribeWithWhisper(tempWavFilename);
          console.log("Whisper transcription:", transcription);
          io.emit("finalTranscription", transcription);
          transcriptionEmitter.emit("transcriptionReady", { processedText: transcription });
        } catch (err) {
          console.error("Error converting/transcribing audio:", err);
        } finally {
          try {
            unlinkSync(tempWebmFilename);
            unlinkSync(tempWavFilename);
            console.log("Temporary files deleted.");
          } catch (cleanupErr) {
            console.error("Error cleaning up temporary files:", cleanupErr);
          }
        }
        audioChunks = [];
      }
    });
  });
}

/**
 * Converts a WebM file to a WAV file (PCM) using FFmpeg.
 * @param inputFile - Path to the input WebM file.
 * @param outputFile - Path to the output WAV file.
 * @returns A Promise that resolves when conversion is complete.
 */
function convertWebmToWav(inputFile: string, outputFile: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputFile)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .toFormat("wav")
      .on("end", () => {
        console.log("Conversion to WAV completed.");
        resolve();
      })
      .on("error", (err: Error) => {
        console.error("Error during conversion:", err);
        reject(err);
      })
      .save(outputFile);
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
  form.append("language", "en");
  form.append("condition_on_previous_text", "false");
  form.append("temperature", "0.0");

  const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", form, {
    headers: {
      ...form.getHeaders(),
      "Authorization": `Bearer ${API_KEY}`,
    },
  });

  return response.data.text;
}
