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
  public audioEmitter: EventEmitter = new EventEmitter();

  private constructor() {
    // Listen for generated output and stream it to TTS.
    outputEmitter.on('outputGenerated', (output: { choices?: { message?: { content: string } }[] } | string) => {
      const generatedText =
        typeof output === 'string'
          ? output
          : output?.choices?.[0]?.message?.content || '';
      console.log("[HumeSentiService] Received generated output for TTS:", generatedText);
      this.streamTextToAudio(generatedText);
    });
  }

  public static getInstance(): HumeSentiService {
    if (!HumeSentiService.instance) {
      HumeSentiService.instance = new HumeSentiService();
    }
    return HumeSentiService.instance;
  }

  public connect(apiKey: string, onPrediction?: PredictionCallback): void {
    const socketUrl = `wss://api.hume.ai/v0/stream/models?apikey=${apiKey}`;
    console.log("[HumeSentiService] Attempting to connect to:", socketUrl);
    this.socket = new WebSocket(socketUrl);

    this.socket.on('open', () => {
      console.log("[HumeSentiService] WebSocket open at:", new Date().toISOString());
    });

    this.socket.on('message', (data: WebSocket.Data) => {
      console.log("[HumeSentiService] Received message at", new Date().toISOString());
      try {
        let jsonData: any;
        if (typeof data === 'string') {
          jsonData = JSON.parse(data);
        } else if (Buffer.isBuffer(data)) {
          jsonData = JSON.parse(data.toString());
        } else {
          console.warn("[HumeSentiService] Unexpected data type received");
          return;
        }
        console.log("[HumeSentiService] Full parsed JSON object:", jsonData);
        if (jsonData.language) {
          const predictions: StreamModelPredictionsLanguage = parseStreamModelPredictionsLanguage(jsonData.language);
          console.log("[HumeSentiService] Parsed predictions:", predictions);
          if (onPrediction && predictions.predictions) {
            onPrediction(predictions.predictions);
          }
          if (predictions.predictions) {
            this.postSentimentData(predictions.predictions);
          }
        } else {
          console.warn("[HumeSentiService] No 'language' property in received message");
        }
      } catch (error) {
        console.error("[HumeSentiService] Error parsing message:", error);
      }
    });

    this.socket.on('close', (code: number, reason: Buffer) => {
      console.log(`[HumeSentiService] WebSocket closed at ${new Date().toISOString()}. Code: ${code}, Reason: "${reason.toString()}"`);
    });

    this.socket.on('error', (error: Error) => {
      console.error("[HumeSentiService] WebSocket error at", new Date().toISOString(), ":", error);
    });
  }

  public sendTextData(text: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[HumeSentiService] Socket not open when attempting to send text data");
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
    console.log("[HumeSentiService] Sending text payload:", payload);
    this.socket.send(JSON.stringify(payload));
  }

  public async streamTextToAudio(text: string): Promise<void> {
    console.log("[HumeSentiService] Starting TTS for text:", text);
    const ttsEndpoint = "https://api.hume.ai/v0/tts/stream/json";
    const payload = {
      utterances: [
        {
          text: text,
          description: "Generated conversational response."
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

      console.log("[HumeSentiService] TTS streaming response received; processing JSON stream...");
      let ttsBuffer = "";
      const audioBuffers: Buffer[] = [];

      response.data.on('data', (chunk: Buffer) => {
        try {
          ttsBuffer += chunk.toString();
          const lines = ttsBuffer.split("\n");
          ttsBuffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const jsonObj = JSON.parse(trimmed);
              if (jsonObj.audio) {
                const audioChunk = Buffer.from(jsonObj.audio, 'base64');
                this.audioEmitter.emit('audioChunk', audioChunk);
                audioBuffers.push(audioChunk);
                console.log("[HumeSentiService] Emitted audio chunk, size:", audioChunk.length);
              }
            } catch (err) {
              console.error("[HumeSentiService] Error parsing complete line:", err);
            }
          }
        } catch (err) {
          console.error("[HumeSentiService] Error processing TTS stream chunk:", err);
        }
      });

      response.data.on('end', () => {
        console.log("[HumeSentiService] TTS streaming ended.");
        if (ttsBuffer.trim().length > 0) {
          try {
            const jsonObj = JSON.parse(ttsBuffer.trim());
            if (jsonObj.audio) {
              const audioChunk = Buffer.from(jsonObj.audio, 'base64');
              this.audioEmitter.emit('audioChunk', audioChunk);
              audioBuffers.push(audioChunk);
              console.log("[HumeSentiService] Emitted final audio chunk, size:", audioChunk.length);
            }
          } catch (err) {
            console.error("[HumeSentiService] Error parsing final buffer:", err);
          }
        }
        const completeAudioBuffer = Buffer.concat(
          audioBuffers.map(b => new Uint8Array(b.buffer, b.byteOffset, b.byteLength))
        );
        this.audioEmitter.emit('audioReady', completeAudioBuffer);
        console.log("[HumeSentiService] Emitted complete audio data, total size:", completeAudioBuffer.length);
      });
    } catch (error) {
      console.error("[HumeSentiService] Error streaming text to audio via Hume TTS:", error);
    }
  }

  private async postSentimentData(predictions: StreamModelPredictionsLanguagePredictionsItem[]): Promise<void> {
    if (!predictions || predictions.length === 0) {
      console.warn("[HumeSentiService] No predictions to post");
      return;
    }
    const normalizedPredictions = predictions.map((prediction) => {
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
  
      let normalizedEmotions: { name: string; score: number }[] = [];
      if (Array.isArray(prediction.emotions)) {
        normalizedEmotions = prediction.emotions as { name: string; score: number }[];
      } else if (prediction.emotions && typeof prediction.emotions === "object") {
        normalizedEmotions = Object.entries(prediction.emotions).map(([name, score]) => ({
          name,
          score: Number(score),
        }));
      }
  
      let normalizedSentiment: { score: number }[] = [];
      if (Array.isArray(prediction.sentiment)) {
        normalizedSentiment = prediction.sentiment as { score: number }[];
      } else if (prediction.sentiment && typeof prediction.sentiment === "object") {
        normalizedSentiment = Object.entries(prediction.sentiment).map(([key, value]) => ({
          score: Number(value),
        }));
      }
  
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
      console.log("[HumeSentiService] Sentiment data posted successfully.");
    } catch (error) {
      console.error("[HumeSentiService] Failed to post sentiment data:", error);
    }
  }

  public disconnect(): void {
    if (this.socket) {
      console.log("[HumeSentiService] Disconnecting WebSocket.");
      this.socket.close();
      this.socket = null;
    }
  }
}

export const humeSentiService = HumeSentiService.getInstance();
