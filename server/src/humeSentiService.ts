import WebSocket from 'ws';
import axios from 'axios';
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
   * Connects to Hume’s websocket endpoint.
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

    try {
      await axios.post('http://localhost:3000/api/sentiment', { sentiments: predictions });
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
