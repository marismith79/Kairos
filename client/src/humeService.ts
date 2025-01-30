// import { access } from "fs";
import {
  Hume,
  HumeClient,
  convertBlobToBase64,
  convertBase64ToBlob,
  ensureSingleValidAudioTrack,
  getAudioStream,
  getBrowserSupportedMimeType,
  MimeType,
} from "hume";
import { handleToolCallMessage } from "./tools/humeToolCall";

// Define types for your store state
interface HumeState {
  connected: boolean;
  isRecording: boolean;
  audioStream: MediaStream | null;
  message: string | null; 
}

class HumeStore {
  private state: HumeState = {
    connected: false,
    isRecording: false,
    audioStream: null,
    message: null,
  };
  private listeners: Set<(state: HumeState) => void> = new Set();

  getState(): HumeState {
    return this.state;
  }

  setState(newState: Partial<HumeState>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  subscribe(listener: (state: HumeState) => void) {
    this.listeners.add(listener);
    // Immediately call listener with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

class HumeService {
  private static instance: HumeService;
  private store: HumeStore;
  private messageListeners: Set<(message: any) => void> = new Set(); // To handle message events

  // Method to add a listener for new messages
  public addMessageListener(listener: (message: any) => void): void {
    this.messageListeners.add(listener);
  }

  // Method to remove a listener
  public removeMessageListener(listener: (message: any) => void): void {
    this.messageListeners.delete(listener);
  }

  // Broadcast message to listeners
  private broadcastMessage(message: any): void {
    this.messageListeners.forEach((listener) => listener(message));
  }

  /**
   * the Hume Client, includes methods for connecting to EVI and managing the Web Socket connection
   */
  private client: HumeClient | null = null;

  /**
   * the WebSocket instance
   */
  private socket: Hume.empathicVoice.chat.ChatSocket | null = null;

  /**
   * the recorder responsible for recording the audio stream to be prepared as the audio input
   */
  private recorder: MediaRecorder | null = null;

  /**
   * the stream of audio captured from the user's microphone
   */
  private audioStream: MediaStream | null = null;

  /**
   * the current audio element to be played
   */

  private currentAudio: HTMLAudioElement | null = null;

  /**
   * flag which denotes whether audio is currently playing or not
   */
  private isPlaying = false;

  /**
   * flag which denotes whether to utilize chat resumability (preserve context from one chat to the next)
   */
  private resumeChats = true;

  /**
   * The ChatGroup ID used to resume the chat if disconnected unexpectedly
   */
  private chatGroupId: string | undefined;

  /**
   * audio playback queue
   */
  private audioQueue: Blob[] = [];

  /**
   * the config ID for our Hume configuration
   */

  private configID = "3b2e59d1-9efc-4424-90bd-fa497a57bc57"

  /**
   * mime type supported by the browser the application is running in
   */
  private mimeType: MimeType = (() => {
    const result = getBrowserSupportedMimeType();
    return result.success ? result.mimeType : MimeType.WEBM;
  })();

  private constructor() {
    this.store = new HumeStore();

    // Bind all event handlers in constructor
    this.handleWebSocketOpenEvent = this.handleWebSocketOpenEvent.bind(this);
    this.handleWebSocketCloseEvent = this.handleWebSocketCloseEvent.bind(this);
    this.handleWebSocketMessageEvent = this.handleWebSocketMessageEvent.bind(this);
    this.handleWebSocketErrorEvent = this.handleWebSocketErrorEvent.bind(this);
  }

  public static getInstance(): HumeService {
    if (!HumeService.instance) {
      HumeService.instance = new HumeService();
    }
    return HumeService.instance;
  }

  // Method to get store for components to subscribe to
  public getStore(): HumeStore {
    return this.store;
  }

  private async getHumeAccessToken() {
    try {
      const response = await fetch(
        "http://localhost:3000/api/getHumeAccessToken"
      );
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error("Error fetching Hume access token from server:", error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    const accessToken = await this.getHumeAccessToken();

    // instantiate the HumeClient with credentials to make authenticated requests
    if (!this.client) {
      this.client = new HumeClient({
        accessToken: accessToken,
      });
    }

    // instantiates WebSocket and establishes an authenticated connection
    this.socket = await this.client.empathicVoice.chat.connect({
      // configuration that includes the resource finder tool
      configId: this.configID,
      resumedChatGroupId: this.chatGroupId,
    });

    this.socket.on("open", this.handleWebSocketOpenEvent);
    this.socket.on("message", this.handleWebSocketMessageEvent);
    this.socket.on("error", this.handleWebSocketErrorEvent);
    this.socket.on("close", this.handleWebSocketCloseEvent);
  }

  /**
   * stops audio capture and playback, and closes the Web Socket connection
   */
  public disconnect(): void {
    // stop audio playback
    this.stopAudio();

    // stop audio capture
    if (this.recorder) {
      this.recorder.stop();  // Stop the recorder
      this.recorder = null;   // Clear the recorder instance
    }
  
    if (this.audioStream) {
      // Stop all audio tracks to fully release the microphone
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;  // Clear the audio stream
    }
  
    // set connected state to false to prevent automatic reconnect
    this.getStore().setState({ connected: false });

    // IF resumeChats flag is false, reset chatGroupId so a new conversation is started when reconnecting
    if (!this.resumeChats) {
      this.chatGroupId = undefined;
    }

    // closed the Web Socket connection
    this.socket?.close();
    this.socket = null; // Clear the socket instance
  }

  /**
   * captures and records audio stream, and sends audio stream through the socket
   *
   * API Reference:
   * - `audio_input`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#send.Audio%20Input.type
   */
  private async captureAudio(): Promise<void> {
    this.audioStream = await getAudioStream();
    // ensure there is only one audio track in the stream
    ensureSingleValidAudioTrack(this.audioStream);
    let mimeType = this.mimeType;

    // instantiate the media recorder
    this.recorder = new MediaRecorder(this.audioStream, { mimeType });

    // callback for when recorded chunk is available to be processed
    this.recorder.ondataavailable = async ({ data }) => {
      // IF size of data is smaller than 1 byte then do nothing
      if (data.size < 1) return;

      // base64 encode audio data
      const encodedAudioData = await convertBlobToBase64(data);

      // define the audio_input message JSON
      const audioInput: Omit<Hume.empathicVoice.AudioInput, "type"> = {
        data: encodedAudioData,
      };

      // send audio_input message
      this.socket?.sendAudioInput(audioInput);
    };

    // capture audio input at a rate of 100ms (recommended)
    const timeSlice = 100;
    this.recorder.start(timeSlice);
  }

  /**
   * play the audio within the playback queue, converting each Blob into playable HTMLAudioElements
   */
  private playAudio(): void {
    // IF there is nothing in the audioQueue OR audio is currently playing then do nothing
    if (!this.audioQueue.length || this.isPlaying) return;

    // update isPlaying state
    this.isPlaying = true;

    // pull next audio output from the queue
    const audioBlob = this.audioQueue.shift();

    // IF audioBlob is unexpectedly undefined then do nothing
    if (!audioBlob) return;

    // converts Blob to AudioElement for playback
    const audioUrl = URL.createObjectURL(audioBlob);
    this.currentAudio = new Audio(audioUrl);

    // play audio
    this.currentAudio.play();

    // callback for when audio finishes playing
    this.currentAudio.onended = () => {
      // update isPlaying state
      this.isPlaying = false;

      // attempt to pull next audio output from queue
      if (this.audioQueue.length) this.playAudio();
    };
  }

  /**
   * stops audio playback, clears audio playback queue, and updates audio playback state
   */
  private stopAudio(): void {
    // stop the audio playback
    this.currentAudio?.pause();
    this.currentAudio = null;

    // update audio playback state
    this.isPlaying = false;

    // clear the audioQueue
    this.audioQueue.length = 0;
  }

  /**
   * callback function to handle a WebSocket opened event
   */
  private async handleWebSocketOpenEvent(): Promise<void> {
    /* place logic here which you would like invoked when the socket opens */
    console.log("Web socket connection opened");

    // ensures socket will reconnect if disconnected unintentionally
    this.getStore().setState({ connected: true });
    await this.captureAudio();
  }

  /**
   * callback function to handle a WebSocket message event
   *
   * API Reference:
   * - `chat_metadata`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Chat%20Metadata.type
   * - `user_message`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Message.type
   * - `assistant_message`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Assistant%20Message.type
   * - `audio_output`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Audio%20Output.type
   * - `user_interruption`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.User%20Interruption.type
   * - `tool_call`: https://dev.hume.ai/reference/empathic-voice-interface-evi/chat/chat#receive.Tool%20Call%20Message.type
   */
  private async handleWebSocketMessageEvent(
    message: Hume.empathicVoice.SubscribeEvent
  ): Promise<void> {
    /* place logic here which you would like to invoke when receiving a message through the socket */
    console.log(message);
      // Validate the message structure
    
    // handle messages received through the WebSocket (messages are distinguished by their "type" field.)
    switch (message.type) {
      // save chat_group_id to resume chat if disconnected
      case "chat_metadata":
        this.chatGroupId = message.chatGroupId;
        break;

      // append user and assistant messages to UI for chat visibility
      case "user_message":
      case "assistant_message":
        const { role, content } = message.message;
        const topThreeEmotions = this.extractTopThreeEmotions(message);
        this.appendMessage(role, content ?? "", topThreeEmotions);
        break;

      // add received audio to the playback queue, and play next audio output
      case "audio_output":
        // convert base64 encoded audio to a Blob
        const audioOutput = message.data;
        const blob = convertBase64ToBlob(audioOutput, this.mimeType);

        // add audio Blob to audioQueue
        this.audioQueue.push(blob);

        // play the next audio output
        if (this.audioQueue.length >= 1) this.playAudio();
        break;

      // stop audio playback, clear audio playback queue, and update audio playback state on interrupt
      case "user_interruption":
        this.stopAudio();
        break;

      // invoke tool upon receiving a tool_call message
      case "tool_call":
        handleToolCallMessage(message, this.socket);
        break;
    }
    this.broadcastMessage(message);
  }

  /**
   * callback function to handle a WebSocket error event
   */
  private handleWebSocketErrorEvent(error: Error): void {
    /* place logic here which you would like invoked when receiving an error through the socket */
    console.error(error);
  }

  /**
   * callback function to handle a WebSocket closed event
   */
  private async handleWebSocketCloseEvent(): Promise<void> {
    /* place logic here which you would like invoked when the socket closes */

    // reconnect to the socket if disconnect was unintentional
    if (this.getStore().getState().connected) await this.connect();

    console.log("Web socket connection closed");
  }

  /**
   * adds message to Chat in the webpage's UI
   *
   * @param role the speaker associated with the audio transcription
   * @param content transcript of the audio
   * @param topThreeEmotions the top three emotion prediction scores for the message
   */
  
    // Function to append the message to the UI with emotion scores
    private appendMessage(
      role: Hume.empathicVoice.Role,
      content: string,
      topThreeEmotions: { emotion: string; score: any }[]
    ): void {
      // generate chat card component with message content and emotion scores
      const chatCard = new ChatCard({
        role,
        timestamp: new Date().toLocaleTimeString(),
        content,
        scores: topThreeEmotions,
      });
  
      // append chat card to the UI
      const chat = document.querySelector<HTMLDivElement>("div#chat");
      chat?.appendChild(chatCard.render());
  
      // scroll to the bottom to view most recently added message
      if (chat) chat.scrollTop = chat.scrollHeight;
    }
  
    // Function to extract the top 3 emotions from a message
    private extractTopThreeEmotions(
      message:
        | Hume.empathicVoice.UserMessage
        | Hume.empathicVoice.AssistantMessage
    ): { emotion: string; score: string }[] {
      // extract emotion scores from the message
      const scores = message.models.prosody?.scores;
  
      // convert the emotions object into an array of key-value pairs
      const scoresArray = Object.entries(scores || {});
  
      // sort the array by the values in descending order
      scoresArray.sort((a, b) => b[1] - a[1]);
  
      // extract the top three emotions and convert them back to an object
      const topThreeEmotions = scoresArray
        .slice(0, 3)
        .map(([emotion, score]) => ({
          emotion,
          score: (Math.round(Number(score) * 100) / 100).toFixed(2),
        }));
  
      return topThreeEmotions;
    }
  }
    /**
   * The code below does not pertain to the EVI implementation, and only serves to style the UI.
   */

  interface Score {
    emotion: string;
    score: string;
  }

  interface ChatMessage {
    role: Hume.empathicVoice.Role;
    timestamp: string;
    content: string;
    scores: Score[];
  }
  
  class ChatCard {
    public message: ChatMessage;
  
    constructor(message: ChatMessage) {
      this.message = message;
    }
  
    private createScoreItem(score: Score): HTMLElement {
      const scoreItem = document.createElement('div');
      scoreItem.className = 'score-item';
      scoreItem.innerHTML = `${score.emotion}: <strong>${score.score}</strong>`;
      return scoreItem;
    }
  
    public render(): HTMLElement {
      const card = document.createElement('div');
      card.className = `chat-card ${this.message.role}`;
  
      const role = document.createElement('div');
      role.className = 'role';
      role.textContent =
        this.message.role.charAt(0).toUpperCase() + this.message.role.slice(1);
  
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.innerHTML = `<strong>${this.message.timestamp}</strong>`;
  
      const content = document.createElement('div');
      content.className = 'content';
      content.textContent = this.message.content;
  
      const scores = document.createElement('div');
      scores.className = 'scores';
      this.message.scores.forEach((score) => {
        scores.appendChild(this.createScoreItem(score));
      });
  
      card.appendChild(role);
      card.appendChild(timestamp);
      card.appendChild(content);
      card.appendChild(scores);
  
      return card;
    }
  }
  
  export const humeService = HumeService.getInstance();
  