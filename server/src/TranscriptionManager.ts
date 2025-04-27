import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { SpeakingState } from "./tools/models";
import { initializeSpeechConfig } from "./tools/config.js";
import { humeSentiService } from "./humeSentiService.js";
import { Server as SocketIOServer } from "socket.io";

/**
 * TranscriptionManager class handles the speech-to-text transcription process.
 * It manages the Azure Speech SDK components and processes audio data from Twilio.
 */
export class TranscriptionManager {
  private pushStream: sdk.AudioInputStream | null = null;
  private transcriber: sdk.ConversationTranscriber | null = null;
  private currentSpeakingState: SpeakingState;
  private io: SocketIOServer;
  private isTranscribing: boolean = false;
  private phoneNumber: string = ""; // Store the phone number associated with the current stream

  /**
   * Creates a new TranscriptionManager instance.
   *
   * @param io - The Socket.IO server for emitting events to clients
   */
  constructor(io: SocketIOServer) {
    this.io = io;
    this.currentSpeakingState = this.getInitialSpeakingState();
    console.log("TranscriptionManager initialized for this web socket connection, the underlying transcriber will be created once I receive a start signal...");
  }

  /**
   * Gets the current push stream.
   *
   * @returns The current push stream or null if not initialized
   */
  public getPushStream(): sdk.AudioInputStream | null {
    return this.pushStream;
  }

  /**
   * Initializes the transcriber for a new call.
   * 
   * @param phoneNumber - The phone number associated with the current stream
   */
  public initializeTranscriber(phoneNumber?: string): void {
    try {
      if (phoneNumber) {
        this.phoneNumber = phoneNumber;
        console.log(`Using phone number ${phoneNumber} as speaker ID`);
      }
      this.setupTranscriber();
      this.registerTranscriberEvents();
      this.isTranscribing = true;
      console.log("Transcriber initialized successfully");
    } catch (error) {
      console.error("Error initializing transcriber:", error);
    }
  }

  /**
   * Gets the initial speaking state.
   *
   * @returns The initial speaking state
   */
  private getInitialSpeakingState(): SpeakingState {
    return {
      speakerId: this.phoneNumber || "", // Use phone number as speaker ID if available
      lastUpdateTime: Date.now(),
      isActive: false,
      currentBubbleId: "",
    };
  }

  /**
   * Sets up the transcriber with the appropriate configuration.
   */
  private setupTranscriber(): void {
    // Get speech config from the config module
    const speechConfig: sdk.SpeechConfig = initializeSpeechConfig();
    speechConfig.speechRecognitionLanguage = "en-US";
    speechConfig.enableDictation(); // Enable dictation mode for better continuous speech recognition

    // Create a push stream for audio input
    this.pushStream = sdk.AudioInputStream.createPushStream(
      sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1)
    );

    // Create audio config from the push stream
    const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream);

    // Create a conversation transcriber with our speech config and audio config
    this.transcriber = new sdk.ConversationTranscriber(
      speechConfig,
      audioConfig
    );

    console.log("Transcriber setup complete");
  }

  /**
   * Cleans up resources when a call ends.
   */
  public async cleanup(): Promise<void> {
    console.log("Cleaning up transcription resources");
    this.isTranscribing = false;
    this.phoneNumber = ""; // Reset the phone number

    if (this.transcriber) {
      try {
        await this.transcriber.stopTranscribingAsync();
        this.transcriber = null;
        console.log("Transcriber stopped successfully");
      } catch (error) {
        console.error("Error stopping transcriber:", error);
      }
    }

    if (this.pushStream) {
      try {
        (this.pushStream as sdk.PushAudioInputStream).close();
        this.pushStream = null;
        console.log("Push stream closed successfully");
      } catch (error) {
        console.error("Error closing push stream:", error);
      }
    }

    this.currentSpeakingState = this.getInitialSpeakingState();
  }

  /**
   * Registers event handlers for the transcriber.
   */
  private registerTranscriberEvents(): void {
    if (!this.transcriber) {
      console.error("Cannot register events: transcriber is null");
      return;
    }

    // Handle interim transcription results
    this.transcriber.transcribing = this.handleInterimTranscription.bind(this);

    // Handle final transcription results
    this.transcriber.transcribed = this.handleFinalTranscription.bind(this);

    // Handle cancellation events
    this.transcriber.canceled = (s, e) => {
      console.log(`CANCELED: Reason=${e.reason}`);
      if (e.reason === sdk.CancellationReason.Error) {
        console.log(`CANCELED: ErrorCode=${e.errorCode}`);
        console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
        console.log(
          "CANCELED: Did you update the key and location/region info?"
        );
      }
    };

    // Handle session stopped events
    this.transcriber.sessionStopped = (s, e) => {
      console.log("Session stopped event.");
    };

    // Start continuous transcription
    this.transcriber.startTranscribingAsync(
      () => {
        console.log("Continuous transcription started successfully");
      },
      (err) => {
        console.error("Error starting transcription:", err);
        console.error("Error details:", JSON.stringify(err, null, 2));
        if (this.transcriber) {
          this.transcriber.close();
        }
      }
    );
  }

  /**
   * Handles interim transcription results.
   *
   * @param s - The sender
   * @param e - The event arguments
   */
  private handleInterimTranscription(s: any, e: any): void {
    console.log("Interim transcription received:", e.result.text);
    if (e.result) {
      const interimText = e.result.text;
      const currentTime = Date.now();

      // Generate new bubble ID for new speech segments
      const newBubbleId = `bubble-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      if (
        !this.currentSpeakingState.isActive ||
        currentTime - this.currentSpeakingState.lastUpdateTime > 1500
      ) {
        // Always use the phone number as the speaker ID
        // This is the key change to ensure we're using the phone number instead of diarization
        this.currentSpeakingState = {
          speakerId: this.phoneNumber, // Always use phone number as speaker ID
          lastUpdateTime: currentTime,
          isActive: true,
          currentBubbleId: newBubbleId,
        };

        // Emit event for new speech segment
        this.io.emit("startTranscription", {
          bubbleId: newBubbleId,
          speakerId: this.phoneNumber, // Always use phone number as speaker ID
          text: interimText,
          isInterim: true,
          timestamp: new Date().toISOString(),
          source: "conference", // Indicate this is from a conference call
        });

        console.log(
          `New speech segment (${this.phoneNumber}): ${interimText}`
        );
      } else {
        // Update existing speech segment
        this.currentSpeakingState.lastUpdateTime = currentTime;

        // Emit event for updated speech segment
        this.io.emit("interimTranscription", {
          bubbleId: this.currentSpeakingState.currentBubbleId,
          speakerId: this.phoneNumber, // Always use phone number as speaker ID
          text: interimText,
          isInterim: true,
          timestamp: new Date().toISOString(),
          source: "conference", // Indicate this is from a conference call
        });
      }
    }
  }

  /**
   * Handles final transcription results.
   *
   * @param s - The sender
   * @param e - The event arguments
   */
  private handleFinalTranscription(s: any, e: any): void {
    if (e.result) {
      const finalText = e.result.text;
      
      // Always use the phone number as the speaker ID
      // This is the key change to ensure we're using the phone number instead of diarization
      const speakerId = this.phoneNumber;

      console.log(`FINAL (Speaker ${speakerId}): ${finalText}`);

      // Create transcription data object
      const transcriptionData = {
        bubbleId: this.currentSpeakingState.currentBubbleId,
        finalBubbleId: `final-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        text: finalText,
        speakerId: speakerId, // Always use phone number as speaker ID
        isInterim: false,
        timestamp: new Date().toISOString(),
        source: "conference", // Indicate this is from a conference call
      };

      // Emit final transcription event
      this.io.emit("finalTranscription", transcriptionData);

      // Send text data to Hume for sentiment analysis
      if (finalText.trim().length > 0) {
        humeSentiService.sendTextData(finalText);
      }

      // Reset speaking state
      this.currentSpeakingState = {
        speakerId: this.phoneNumber, // Always use phone number as speaker ID
        lastUpdateTime: Date.now(),
        isActive: false,
        currentBubbleId: "",
      };
    }
  }
}