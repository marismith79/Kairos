import WebSocket from "ws";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static"; 
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
ffmpeg.setFfprobePath(ffprobePath.path);

export const transcriptionEmitter = new EventEmitter();

// Ensure that the API key is non-null.
const API_KEY: string = O1_MINI_HIGH_API_KEY!;
if (!API_KEY) {
  throw new Error("API key is missing");
}

/**
 * Helper function to concatenate multiple Uint8Array chunks.
 */
function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Starts the transcription service using WebSocket.
 */
export function startTranscription(httpServer: any, io: any): void {
  const wss = new WebSocket.Server({ server: httpServer });

  wss.on("error", (error: Error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New Connection Initiated");
    // Instead of keeping an array of separate chunks, we accumulate all binary data.
    let audioChunks: Uint8Array[] = [];

    ws.on("error", (error: Error) => {
      console.error("WebSocket connection error:", error);
    });

    ws.on("message", async (message: any) => {
      // Distinguish control messages (JSON) from binary audio data.
      if (typeof message === "string") {
        const msg = JSON.parse(message);
        await handleControlMessage(msg);
      } else if (Buffer.isBuffer(message)) {
        // If a small buffer might be a control event, try to parse it.
        if (message.length < 100) {
          try {
            const text = message.toString("utf8");
            const msg = JSON.parse(text);
            await handleControlMessage(msg);
            return;
          } catch (e) {
            // Not a valid control message—treat it as binary.
          }
        }
        console.log("Received audio chunk (binary). Buffer length:", message.length);
        audioChunks.push(new Uint8Array(message));
      }

      async function handleControlMessage(msg: any) {
        switch (msg.event) {
          case "connected":
            console.log("A new call has connected.");
            io.emit("resetChat");
            break;
          case "start":
            console.log(`Starting Media Stream ${msg.streamSid}`);
            break;
          case "vad":
            console.log("VAD event received:", msg.status);
            if (msg.status === "silence") {
              await flushAudio();
            }
            break;
          case "media":
            console.log("Received media chunk (JSON). Data URL length:", msg.media.payload.length);
            const dataUrl: string = msg.media.payload;
            const matches = dataUrl.match(/^data:(.*?);base64,(.*)$/);
            if (!matches) {
              console.error("Invalid data URL received");
              break;
            }
            const base64Data = matches[2];
            const buf = Buffer.from(base64Data, "base64");
            audioChunks.push(new Uint8Array(buf));
            break;
          case "stop":
            console.log("Call Has Ended");
            clearConversationHistory();
            break;
          default:
            break;
        }
      }

      async function flushAudio(): Promise<void> {
        if (audioChunks.length === 0) {
          console.log("No audio data to flush.");
          return;
        }
        console.log("Flushing complete audio event. Total chunks:", audioChunks.length);
        // Concatenate all chunks into one complete Uint8Array.
        const completeBuffer = concatUint8Arrays(audioChunks);
        // Write the complete buffer to a single WebM file.
        const completeFilename = `/tmp/${uuidv4()}.webm`;
        writeFileSync(completeFilename, completeBuffer);
        // Validate the file using ffprobe.
        const isValid = await validateChunk(completeFilename);
        if (!isValid) {
          console.error(`Invalid complete audio file: ${completeFilename}`);
          try {
            unlinkSync(completeFilename);
          } catch (e) {
            console.error("Error cleaning up invalid file:", e);
          }
          // Clear the buffer and exit.
          audioChunks = [];
          return;
        }
        // Proceed with conversion.
        const tempWavFilename: string = `/tmp/${uuidv4()}.wav`;
        try {
          await convertWebmToWav(completeFilename, tempWavFilename);
          const transcription = await transcribeWithWhisper(tempWavFilename);
          console.log("Whisper transcription:", transcription);
          io.emit("finalTranscription", transcription);
          transcriptionEmitter.emit("transcriptionReady", { processedText: transcription });
        } catch (err) {
          console.error("Error converting/transcribing audio:", err);
        } finally {
          try {
            unlinkSync(completeFilename);
            unlinkSync(tempWavFilename);
            console.log("Temporary files deleted.");
          } catch (e) {
            console.error("Error cleaning up temporary files:", e);
          }
        }
        // Clear the accumulated audio data.
        audioChunks = [];
      }
    });
  });
}

/**
 * Converts a WebM file to a WAV file (PCM) using FFmpeg.
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
 * Validates a file using ffprobe.
 * Verifies that the file begins with the expected EBML header: 0x1A 0x45 0xDF 0xA3.
 */
function validateChunk(filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const fileBuffer = require("fs").readFileSync(filename);
      const header = fileBuffer.slice(0, 4);
      if (header[0] !== 0x1A || header[1] !== 0x45 || header[2] !== 0xDF || header[3] !== 0xA3) {
        console.error(`Missing EBML header in file: ${filename}`);
        return resolve(false);
      }
    } catch (e) {
      console.error(`Error reading file ${filename}:`, e);
      return resolve(false);
    }
    ffmpeg.ffprobe(filename, (err, metadata) => {
      if (err) {
        console.error(`ffprobe error for ${filename}:`, err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Transcribes the audio file using OpenAI's Whisper API.
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
