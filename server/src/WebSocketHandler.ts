import WebSocket from "ws";
import { TwilioHandler } from "./twilioHandler.js";
import { TranscriptionManager } from "./TranscriptionManager.js";
import { WaveFile } from "wavefile";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

/**
 * WebSocketHandler class manages WebSocket connections for Twilio conference calls.
 * It receives audio data from Twilio Media Streams and processes it for transcription.
 */
export class WebSocketHandler {
  private wss: WebSocket.Server;
  private transcriptionManager: TranscriptionManager;
  private twilioHandler: TwilioHandler;

  /**
   * Creates a new WebSocketHandler instance.
   * 
   * @param httpServer - The HTTP server to attach the WebSocket server to
   * @param io - The Socket.IO server for emitting events to clients
   */
  constructor(httpServer: http.Server, io: SocketIOServer) {
    this.wss = new WebSocket.Server({ 
      server: httpServer,
      path: '/stream' // This path must match the one in the Twilio TwiML response
    });
    
    this.transcriptionManager = new TranscriptionManager(io);
    this.twilioHandler = new TwilioHandler();
    
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
    
    ws.on("message", this.handleMessage.bind(this, ws));
    ws.on("error", this.handleError.bind(this));
    ws.on("close", (code, reason) => {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
      // Clean up resources when connection closes
      this.transcriptionManager.cleanup();
    });
  }

  /**
   * Handles incoming WebSocket messages.
   * 
   * @param ws - The WebSocket connection
   * @param message - The message received
   */
  private async handleMessage(ws: WebSocket, message: WebSocket.Data): Promise<void> {
    try {
      const msg = JSON.parse(message.toString());
      
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
      
      // Initialize the transcription manager for this call
      this.transcriptionManager.initializeTranscriber();
      console.log("Transcriber initialized for call:", callSid);
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
      // Get the audio payload from the message
      const payload = msg.media.payload;
      
      // Create a wave file from the incoming data
      const wav = new WaveFile();
      wav.fromScratch(1, 8000, "8m", Buffer.from(payload, "base64"));
      
      // Convert from mu-law to PCM
      wav.fromMuLaw();
      
      // Ensure the sample rate is 8kHz
      wav.toSampleRate(8000);
      
      // Get the samples as Int16Array
      const samples = (wav.data as any).samples;
      
      // Convert the samples to a buffer for TranscriptionManager to consume
      const audioBuffer = new Int16Array(samples).buffer;
      
      // Write to the pushStream through TranscriptionManager
      this.transcriptionManager.writeToPushStream(audioBuffer);
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
    console.log("Twilio Stream stopped for call:", msg.stop.callSid);
    
    // Clean up transcription resources
    this.transcriptionManager.cleanup();
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

