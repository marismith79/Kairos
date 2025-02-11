// HumeService.ts
import {
  getAudioStream,
  ensureSingleValidAudioTrack,
  getBrowserSupportedMimeType,
  MimeType,
} from "hume"; // (Assumed available)
import { blobToBase64 } from "./utils/blobUtilities";
import { parseStreamModelPredictionsLanguage } from "./tools/parsers";
import {
  StreamModelPredictionsLanguage,
  StreamModelPredictionsLanguagePredictionsItem,
} from "./tools/models";

type PredictionCallback = (predictions: StreamModelPredictionsLanguagePredictionsItem[]) => void;

class HumeService {
  private static instance: HumeService;
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private mimeType: MimeType;
  // Buffer for small audio blobs.
  private audioBuffer: Blob[] = [];
  // Interval (in ms) for sending batched audio.
  private streamWindowMs: number = 1000; // Adjust as needed.
  private sendIntervalId: number | null = null;

  private constructor() {
    const result = getBrowserSupportedMimeType();
    this.mimeType = result.success ? result.mimeType : MimeType.WEBM;
  }

  public static getInstance(): HumeService {
    if (!HumeService.instance) {
      HumeService.instance = new HumeService();
    }
    return HumeService.instance;
  }

  /**
   * Connects directly from the browser to Hume’s websocket endpoint.
   * @param apiKey 
   * @param onPrediction 
   */
  public async connect(apiKey: string, onPrediction?: PredictionCallback): Promise<void> {
    const socketUrl = `wss://api.hume.ai/v0/stream/models?apikey=${apiKey}`;
    console.log("Attempting to connect to:", socketUrl);
    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      console.log("WebSocket open at:", new Date().toISOString());
      // Start capturing audio once the socket is open.
      this.startAudioCapture();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      console.log("Received message at", new Date().toISOString(), ":", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.language) {
          const predictions: StreamModelPredictionsLanguage = parseStreamModelPredictionsLanguage(data.language);
          console.log("Parsed predictions:", predictions);
          if (onPrediction && predictions.predictions) {
            onPrediction(predictions.predictions);
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    this.socket.onclose = (event: CloseEvent) => {
      console.log(
        `WebSocket closed at ${new Date().toISOString()}. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`
      );
    };

    this.socket.onerror = (error: Event) => {
      console.error("WebSocket error event at", new Date().toISOString(), ":", error);
    };
  }

  /**
   * Starts capturing audio and batches the blobs to send as one combined audio file.
   */
  private async startAudioCapture(): Promise<void> {
    console.log("Starting audio capture at:", new Date().toISOString());
    this.audioStream = await getAudioStream();
    console.log("Obtained audio stream:", this.audioStream);
    ensureSingleValidAudioTrack(this.audioStream);
    this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType: this.mimeType });
    console.log("MediaRecorder created with mimeType:", this.mimeType);

    // Accumulate blobs from each ondataavailable event.
    this.mediaRecorder.ondataavailable = async ({ data }) => {
      console.log(`ondataavailable triggered at ${new Date().toISOString()}, data size: ${data.size}`);
      if (data.size < 1) return;
      this.audioBuffer.push(data);
    };

    // Start recording in 100ms intervals.
    this.mediaRecorder.start(100);
    console.log("MediaRecorder started with time slice 100ms");

    // Set an interval to batch and send the accumulated audio.
    this.sendIntervalId = window.setInterval(() => {
      this.sendAudioBuffer();
    }, this.streamWindowMs);
  }

  /**
   * Combines buffered audio blobs, converts them to a Base64 string using blobToBase64,
   * and sends the payload to the Hume API.
   */
  private async sendAudioBuffer(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Socket not open when attempting to send audio");
      return;
    }
    if (this.audioBuffer.length === 0) {
      // Nothing to send.
      return;
    }

    // Combine the buffered blobs into one Blob.
    const combinedBlob = new Blob(this.audioBuffer, { type: this.mimeType });
    // Clear the buffer.
    this.audioBuffer = [];

    // Convert the combined Blob to a Base64 string using blobToBase64.
    const base64Audio: string = await blobToBase64(combinedBlob);

    // Construct the payload exactly as required by the API.
    const payload = {
      data: base64Audio, 
      models: {
        language: {
          granularity: "passage",
          toxicity: {},
          sentiment: {},
        },
      },
      stream_window_ms: this.streamWindowMs,
    };

    console.log("Sending batched audio payload:", payload);
    this.socket.send(JSON.stringify(payload));
  }

  public disconnect(): void {
    if (this.sendIntervalId !== null) {
      clearInterval(this.sendIntervalId);
      this.sendIntervalId = null;
    }
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const humeService = HumeService.getInstance();
