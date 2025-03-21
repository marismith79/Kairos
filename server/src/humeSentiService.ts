import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
import { formatPredictions } from "./tools/predictionFormatter.js";
import { parseStreamModelPredictionsLanguage } from "./tools/parsers.js";
import {
  StreamModelPredictionsLanguage,
  StreamModelPredictionsLanguagePredictionsItem,
} from "./tools/models.js";
import { outputEmitter } from "./generative.js";

type PredictionCallback = (predictions: StreamModelPredictionsLanguagePredictionsItem[]) => void;

class HumeSentiService {
  private static instance: HumeSentiService;
  private socket: WebSocket | null = null;
  // This emitter will be used to send the completed audio Buffer downstream.
  public audioEmitter: EventEmitter = new EventEmitter();

  private constructor() {
    // Listen for generated chatbot output and stream it to TTS.
    outputEmitter.on('outputGenerated', (output: { choices?: { message?: { content: string } }[] } | string) => {
      const generatedText =
        typeof output === 'string'
          ? output
          : output?.choices?.[0]?.message?.content || '';

      console.log("Received generated output for TTS:", generatedText);
      console.log("Full generated output:", JSON.stringify(output, null, 2));
      this.streamTextToAudio(generatedText);
    });
  }

  public static getInstance(): HumeSentiService {
    if (!HumeSentiService.instance) {
      HumeSentiService.instance = new HumeSentiService();
    }
    return HumeSentiService.instance;
  }

  /**
   * Connects to Hume’s sentiment analysis websocket endpoint.
   * @param apiKey - Your Hume API key.
   * @param onPrediction - Optional callback for handling prediction items.
   */
  public connect(apiKey: string, onPrediction?: PredictionCallback): void {
    const socketUrl = `wss://api.hume.ai/v0/stream/models?apikey=${apiKey}`;
    console.log("Attempting to connect to:", socketUrl);
    this.socket = new WebSocket(socketUrl);

    this.socket.on('open', () => {
      console.log("WebSocket open at:", new Date().toISOString());
    });

    this.socket.on('message', (data: WebSocket.Data) => {
      console.log("Received message at", new Date().toISOString());
      try {
        let jsonData: any;
        if (typeof data === 'string') {
          jsonData = JSON.parse(data);
        } else if (Buffer.isBuffer(data)) {
          jsonData = JSON.parse(data.toString());
        } else {
          console.warn("Unexpected data type received");
          return;
        }
        console.log("Full parsed JSON object:", jsonData);
        if (jsonData.language) {
          const predictions: StreamModelPredictionsLanguage = parseStreamModelPredictionsLanguage(jsonData.language);
          console.log("Parsed predictions:", predictions);
          if (onPrediction && predictions.predictions) {
            onPrediction(predictions.predictions);
          }
          // Post sentiment data to the server for visualization.
          if (predictions.predictions) {
            this.postSentimentData(predictions.predictions);
          }
        } else {
          console.warn("No 'language' property in received message");
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      console.log(`WebSocket closed at ${new Date().toISOString()}. Code: ${code}, Reason: "${reason.toString()}"`);
    });

    this.socket.on('error', (error: Error) => {
      console.error("WebSocket error at", new Date().toISOString(), ":", error);
    });
  }

  /**
   * Sends raw text data to the Hume sentiment analysis API.
   * @param text - The raw text data to be processed.
   */
  public sendTextData(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Socket not open when attempting to send text data");
      return;
    }

    const payload = {
      data: text,
      models: {
        language: {
          granularity: "passage",
          toxicity: {},
          sentiment: {},
        },
      },
      raw_text: true,
    };

    console.log("Sending text payload:", payload);
    this.socket.send(JSON.stringify(payload));
  }

  /**
   * Streams the given text output to Hume’s TTS endpoint (JSON streaming version) so that MP3 audio is returned.
   * The endpoint is: https://api.hume.ai/v0/tts/stream/json
   *
   * The payload conforms to the curl example provided:
   *  - utterances array with text and description
   *  - format type set to "mp3"
   *
   * As the stream returns JSON objects, each containing an "audio" property (base64 encoded), 
   * we decode and accumulate the audio chunks.
   *
   * Once the stream ends, the complete audio Buffer is emitted via audioEmitter.
   *
   * @param text - The generated output text to convert to audio.
   */
  public async streamTextToAudio(text: string): Promise<void> {
    const ttsEndpoint = "https://api.hume.ai/v0/tts/stream/json";
    const payload = {
      utterances: [
        {
          text: text,
          description: "Generated conversational response." // Customize if needed.
        }
      ],
      format: {
        type: "mp3"
      }
    };

    try {
      const response = await axios.post(ttsEndpoint, payload, {
        responseType: 'stream',
        headers: {
          'X-Hume-Api-Key': process.env.HUME_API_KEY, 
          'Content-Type': 'application/json'
        }
      });
      
      console.log("TTS streaming response received; processing JSON stream...");
      const audioBuffers: Buffer[] = [];
      let ttsBuffer = ""; 

      response.data.on('data', (chunk: Buffer) => {
        try {
          ttsBuffer += chunk.toString();
          // Split the buffer by newline – Hume TTS streams newline-delimited JSON.
          const lines = ttsBuffer.split("\n");
          // The last line might be incomplete; retain it in the buffer.
          ttsBuffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const jsonObj = JSON.parse(trimmed);
              // Check if the JSON object contains an "audio" field.
              if (jsonObj.audio) {
                // Decode the base64-encoded MP3 chunk.
                const audioChunk = Buffer.from(jsonObj.audio, 'base64');
                audioBuffers.push(audioChunk);
                console.log("Received audio chunk, size:", audioChunk.length);
              }
            } catch (err) {
              console.error("Error parsing complete line:", err);
            }
          }
        } catch (err) {
          console.error("Error processing TTS stream chunk:", err);
        }
      });

      response.data.on('end', () => {
        console.log("TTS streaming ended.");
        // Process any remaining buffered data.
        if (ttsBuffer.trim().length > 0) {
          try {
            const jsonObj = JSON.parse(ttsBuffer.trim());
            if (jsonObj.audio) {
              const audioChunk = Buffer.from(jsonObj.audio, 'base64');
              audioBuffers.push(audioChunk);
              console.log("Received final audio chunk, size:", audioChunk.length);
            }
          } catch (err) {
            console.error("Error parsing final buffer:", err);
          }
        }
        // Combine all audio chunks into one complete Buffer.
        const completeAudioBuffer = Buffer.concat(
          audioBuffers.map(b => new Uint8Array(b.buffer, b.byteOffset, b.byteLength))
        );
        this.audioEmitter.emit('audioReady', completeAudioBuffer);
        console.log("Emitted complete audio data, total size:", completeAudioBuffer.length);
      });
    } catch (error) {
      console.error("Error streaming text to audio via Hume TTS:", error);
    }
  }

  /**
   * Filters the predictions for valid sentiment data and posts it to the server.
   * @param predictions - The list of predictions received from Hume.
   */
  private async postSentimentData(predictions: StreamModelPredictionsLanguagePredictionsItem[]): Promise<void> {
    if (!predictions || predictions.length === 0) {
      console.warn("No predictions to post");
      return;
    }
    const normalizedPredictions = predictions.map((prediction) => {
      // Normalize Position property
      let normalizedPosition: { begin: number; end: number };
      if (prediction.position && "begin" in prediction.position && "end" in prediction.position) {
        normalizedPosition = prediction.position as { begin: number; end: number };
      } else if (prediction.position && "start" in prediction.position && "end" in prediction.position) {
        normalizedPosition = {
          begin: prediction.position.start ?? 0,
          end: prediction.position.end ?? 0,
        };
      } else {
        normalizedPosition = { begin: 0, end: 0 };
      }
  
      // Normalize Emotions
      let normalizedEmotions: { name: string; score: number }[] = [];
      if (Array.isArray(prediction.emotions)) {
        normalizedEmotions = prediction.emotions as { name: string; score: number }[];
      } else if (prediction.emotions && typeof prediction.emotions === "object") {
        normalizedEmotions = Object.entries(prediction.emotions).map(([name, score]) => ({
          name,
          score: Number(score),
        }));
      }
  
      // Normalize Sentiment
      let normalizedSentiment: { score: number }[] = [];
      if (Array.isArray(prediction.sentiment)) {
        normalizedSentiment = prediction.sentiment as { score: number }[];
      } else if (prediction.sentiment && typeof prediction.sentiment === "object") {
        normalizedSentiment = Object.entries(prediction.sentiment).map(([key, value]) => ({
          score: Number(value),
        }));
      }
  
      // Normalize Toxicity
      let normalizedToxicity: { score: number }[] = [];
      if (Array.isArray(prediction.toxicity)) {
        normalizedToxicity = prediction.toxicity as { score: number }[];
      } else if (prediction.toxicity && typeof prediction.toxicity === "object") {
        normalizedToxicity = Object.entries(prediction.toxicity).map(([key, value]) => ({
          score: Number(value),
        }));
      }
  
      return {
        text: prediction.text || "",
        position: normalizedPosition,
        emotions: normalizedEmotions,
        sentiment: normalizedSentiment,
        toxicity: normalizedToxicity,
      };
    });
    const formatted = formatPredictions(normalizedPredictions);

    try {
      await axios.post('http://localhost:3000/api/sentiment', { sentiments: formatted });
      console.log("Sentiment data posted successfully");
    } catch (error) {
      console.error("Failed to post sentiment data", error);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const humeSentiService = HumeSentiService.getInstance();
