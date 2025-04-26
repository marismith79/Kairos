import WebSocket from "ws";
import { TwilioHandler } from "./twilioHandler.js";
import { TranscriptionManager } from "./TranscriptionManager.js";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import pkg from "wavefile";
const { WaveFile } = pkg;

/**
 * WebSocketHandler class manages WebSocket connections for Twilio conference calls.
 * It receives audio data from Twilio Media Streams and processes it for transcription.
 */
export class WebSocketHandler {
  private wss: WebSocket.Server;
  private transcriptionManagers: Map<string, TranscriptionManager>; // Map streamSid to TranscriptionManager
  private twilioHandler: TwilioHandler;
  private io: SocketIOServer;

  /**
   * Creates a new WebSocketHandler instance.
   *
   * @param httpServer - The HTTP server to attach the WebSocket server to
   * @param io - The Socket.IO server for emitting events to clients
   */
  constructor(httpServer: http.Server, io: SocketIOServer) {
    this.wss = new WebSocket.Server({
      server: httpServer,
      path: "/stream", // This path must match the one in the Twilio TwiML response
    });

    this.transcriptionManagers = new Map();
    this.twilioHandler = new TwilioHandler();
    this.io = io;

    this.setupWebSocketEvents();
    console.log("WebSocket server initialized for Twilio Media Streams");
  }

  /**
   * Sets up WebSocket event listeners.
   */
  private setupWebSocketEvents(): void {
    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });
  }

  /**
   * Handles new WebSocket connections.
   *
   * @param ws - The WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    console.log("New WebSocket connection established");
    
    // Store the streamSid on the WebSocket object when we get it
    (ws as any).streamSid = null;

    ws.on("message", this.handleMessage.bind(this, ws));
    ws.on("error", this.handleError.bind(this));
    ws.on("close", (code, reason) => {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
      
      // Clean up resources for this specific connection
      const streamSid = (ws as any).streamSid;
      if (streamSid && this.transcriptionManagers.has(streamSid)) {
        this.transcriptionManagers.get(streamSid)?.cleanup();
        this.transcriptionManagers.delete(streamSid);
        this.twilioHandler.removeCallDetails(streamSid);
        console.log(`Cleaned up resources for stream ${streamSid}`);
      }
    });
  }

  /**
   * Handles incoming WebSocket messages.
   *
   * @param ws - The WebSocket connection
   * @param message - The message received
   */
  private async handleMessage(
    ws: WebSocket,
    message: WebSocket.Data
  ): Promise<void> {
    try {
      const msg = JSON.parse(message.toString());
      
      // Store the streamSid on the WebSocket object for later use
      if (msg.streamSid) {
        (ws as any).streamSid = msg.streamSid;
      }

      switch (msg.event) {
        case "connected":
          console.log("Twilio Media Stream connected");
          break;

        case "start":
          await this.handleStartEvent(msg);
          break;

        case "media":
          this.handleMediaEvent(msg);
          break;

        case "stop":
          this.handleStopEvent(msg);
          break;

        default:
          console.log(`Unhandled event type: ${msg.event}`);
          break;
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  /**
   * Handles the 'start' event from Twilio Media Stream.
   *
   * @param msg - The start event message
   */
  private async handleStartEvent(msg: any): Promise<void> {
    const streamSid = msg.streamSid;
    const callSid = msg.start.callSid;
    const tracks = msg.start.tracks;

    console.log("Twilio Stream started:");
    console.log("Call SID:", callSid);
    console.log("Stream SID:", streamSid);
    console.log("Tracks:", tracks);

    try {
      // Fetch call details using the Call SID
      await this.twilioHandler.handleStartEvent(streamSid, callSid);
      
      // Get call details including the phone number
      const callDetails = this.twilioHandler.getCallDetails(streamSid);
      const phoneNumber = callDetails?.from || "";
      
      console.log(`Using phone number ${phoneNumber} as speaker ID for call ${callSid}`);

      // Create a new TranscriptionManager for this stream
      const transcriptionManager = new TranscriptionManager(this.io);
      
      // Initialize the transcription manager with the phone number
      transcriptionManager.initializeTranscriber(phoneNumber);
      
      // Store the TranscriptionManager in our map
      this.transcriptionManagers.set(streamSid, transcriptionManager);
      
      console.log(`Transcriber initialized for call: ${callSid} with phone number: ${phoneNumber}`);
    } catch (error) {
      console.error("Error handling start event:", error);
    }
  }

  /**
   * Handles the 'media' event from Twilio Media Stream.
   *
   * @param msg - The media event message
   */
  private handleMediaEvent(msg: any): void {
    try {
      const streamSid = msg.streamSid;
      
      // Get the TranscriptionManager for this stream
      const transcriptionManager = this.transcriptionManagers.get(streamSid);
      
      if (!transcriptionManager) {
        console.error(`No TranscriptionManager found for stream ${streamSid}`);
        return;
      }

      // Get the audio payload from the message
      const payload = msg.media.payload;

      // Create a wave file from the incoming data
      const wav = new WaveFile();
      wav.fromScratch(1, 8000, "8m", Buffer.from(payload, "base64"));

      // Convert from mu-law to PCM
      wav.fromMuLaw();

      // Ensure the sample rate is 8kHz
      wav.toSampleRate(8000);

      // Write the decoded samples to the push stream for this specific transcription manager
      const pushStream = transcriptionManager.getPushStream() as sdk.PushAudioInputStream;
      if (pushStream) {
        pushStream.write((wav.data as any).samples);
      } else {
        console.error(`No push stream available for stream ${streamSid}`);
      }
    } catch (error) {
      console.error("Error processing media event:", error);
    }
  }

  /**
   * Handles the 'stop' event from Twilio Media Stream.
   *
   * @param msg - The stop event message
   */
  private handleStopEvent(msg: any): void {
    const streamSid = msg.streamSid;
    console.log("Twilio Stream stopped for call:", msg.stop.callSid);

    // Clean up transcription resources for this specific stream
    if (this.transcriptionManagers.has(streamSid)) {
      this.transcriptionManagers.get(streamSid)?.cleanup();
      this.transcriptionManagers.delete(streamSid);
      this.twilioHandler.removeCallDetails(streamSid);
      console.log(`Cleaned up resources for stream ${streamSid}`);
    }
  }

  /**
   * Handles WebSocket errors.
   *
   * @param error - The error that occurred
   */
  private handleError(error: Error): void {
    // Ignore specific WebSocket errors that are common and non-critical
    if ((error as any).code === "WS_ERR_INVALID_CLOSE_CODE") {
      console.warn("Ignoring invalid close code error");
      return;
    }

    console.error("WebSocket error:", error);
  }
}


