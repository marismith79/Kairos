import WebSocket from 'ws';
import axios from 'axios';
import { formatPredictions } from "./tools/predictionFormatter.js";
import { parseStreamModelPredictionsLanguage } from "./tools/parsers.js";
import {
  StreamModelPredictionsLanguage,
  StreamModelPredictionsLanguagePredictionsItem,
} from "./tools/models.js";

type PredictionCallback = (predictions: StreamModelPredictionsLanguagePredictionsItem[]) => void;

class HumeSentiService {
  private static instance: HumeSentiService;
  private socket: WebSocket | null = null;

  private constructor() {
  }

  public static getInstance(): HumeSentiService {
    if (!HumeSentiService.instance) {
      HumeSentiService.instance = new HumeSentiService();
    }
    return HumeSentiService.instance;
  }

  /**
   * Connects to Hume's websocket endpoint.
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
   * Sends raw text data to the Hume API.
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
      // Split the data into sentiment and emotion streams
      const sentimentData = formatted.map(prediction => ({
        time: Date.now(),
        sentiment: prediction.sentiment
      }));

      const emotionData = formatted.map(prediction => ({
        emotions: prediction.emotions,
        toxicity: prediction.toxicity
      }));

      // Send sentiment data to the sentiment endpoint
      await axios.post('http://localhost:3000/api/sentiment', { sentiments: sentimentData });
      
      // Send emotion data to the chat endpoint
      await axios.post('http://localhost:3000/api/chat', { emotions: emotionData });
      
      console.log("Data posted successfully to both endpoints");
    } catch (error) {
      console.error("Failed to post data", error);
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
