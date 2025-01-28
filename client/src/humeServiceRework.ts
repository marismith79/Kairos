// // humeService.ts
// import { HumeStreamClient } from '@hume/sdk';

// // Define types for your store state
// interface HumeState {
//   connected: boolean;
//   isRecording: boolean;
//   audioStream: MediaStream | null;
//   chatGroupId: string | null;
// }

// class HumeStore {
//   private state: HumeState = {
//     connected: false,
//     isRecording: false,
//     audioStream: null,
//     chatGroupId: null
//   };
//   private listeners: Set<(state: HumeState) => void> = new Set();

//   getState(): HumeState {
//     return this.state;
//   }

//   setState(newState: Partial<HumeState>) {
//     this.state = { ...this.state, ...newState };
//     this.notify();
//   }

//   subscribe(listener: (state: HumeState) => void) {
//     this.listeners.add(listener);
//     // Immediately call listener with current state
//     listener(this.state);
//     return () => this.listeners.delete(listener);
//   }

//   private notify() {
//     this.listeners.forEach(listener => listener(this.state));
//   }
// }

// class HumeService {
//   private static instance: HumeService;
//   private client: HumeStreamClient | null = null;
//   private socket: WebSocket | null = null;
//   private store: HumeStore;

//   private constructor() {
//     this.store = new HumeStore();
//   }

//   public static getInstance(): HumeService {
//     if (!HumeService.instance) {
//       HumeService.instance = new HumeService();
//     }
//     return HumeService.instance;
//   }

//   // Method to get store for components to subscribe to
//   public getStore(): HumeStore {
//     return this.store;
//   }

//   public async connect(): Promise<void> {
//     try {
//       const accessToken = await this.getAccessToken();
      
//       this.client = new HumeStreamClient({
//         accessToken: accessToken
//       });

//       this.socket = await this.client.empathicVoice.chat.connect({
//         configId: process.env.HUME_CONFIG_ID,
//         resumedChatGroupId: this.store.getState().chatGroupId
//       });

//       this.socket.addEventListener('open', this.handleSocketOpen);
//       this.socket.addEventListener('close', this.handleSocketClose);
//       this.socket.addEventListener('message', this.handleSocketMessage);
//       this.socket.addEventListener('error', this.handleSocketError);

//     } catch (error) {
//       console.error('Connection failed:', error);
//       this.store.setState({ connected: false });
//       throw error;
//     }
//   }

//   private handleSocketOpen = () => {
//     this.store.setState({ connected: true });
//   };

//   private handleSocketClose = () => {
//     this.store.setState({ 
//       connected: false,
//       isRecording: false,
//       audioStream: null 
//     });
//   };

//   private handleSocketMessage = async (event: MessageEvent) => {
//     const message = JSON.parse(event.data);
    
//     switch (message.type) {
//       case 'chat_metadata':
//         this.store.setState({ chatGroupId: message.chatGroupId });
//         break;
//       // Handle other message types...
//     }
//   };

//   private handleSocketError = (error: Event) => {
//     console.error('Socket error:', error);
//     this.store.setState({ connected: false });
//   };

//   public async startRecording(): Promise<void> {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       this.store.setState({ 
//         isRecording: true,
//         audioStream: stream 
//       });
//       // Additional recording logic...
//     } catch (error) {
//       console.error('Failed to start recording:', error);
//       this.store.setState({ isRecording: false });
//       throw error;
//     }
//   }

//   public stopRecording(): void {
//     const { audioStream } = this.store.getState();
//     if (audioStream) {
//       audioStream.getTracks().forEach(track => track.stop());
//     }
//     this.store.setState({ 
//       isRecording: false,
//       audioStream: null 
//     });
//   }

//   public disconnect(): void {
//     this.stopRecording();
//     this.socket?.close();
//     this.socket = null;
//     this.client = null;
//     this.store.setState({
//       connected: false,
//       isRecording: false,
//       audioStream: null
//     });
//   }

//   private async getAccessToken(): Promise<string> {
//     // Your token fetching logic...
//     return 'your-access-token';
//   }
// }

// // Export singleton instance
// export const humeService = HumeService.getInstance();

// __________________________ create the hook 
// // hooks/useHume.ts
// import { useState, useEffect } from 'react';
// import { humeService } from '../services/humeService';

// export const useHume = () => {
//   const [state, setState] = useState(humeService.getStore().getState());

//   useEffect(() => {
//     const unsubscribe = humeService.getStore().subscribe(setState);
//     return unsubscribe;
//   }, []);

//   return {
//     ...state,
//     connect: () => humeService.connect(),
//     disconnect: () => humeService.disconnect(),
//     startRecording: () => humeService.startRecording(),
//     stopRecording: () => humeService.stopRecording()
//   };
// };


// -------------------   Use in components
// components/VoiceChat.tsx
// import { useHume } from '../hooks/useHume';

// const VoiceChat = () => {
//   const { 
//     connected, 
//     isRecording, 
//     connect, 
//     disconnect,
//     startRecording,
//     stopRecording 
//   } = useHume();

//   return (
//     <div>
//       <div>Status: {connected ? 'Connected' : 'Disconnected'}</div>
      
//       <button 
//         onClick={connected ? disconnect : connect}
//       >
//         {connected ? 'Disconnect' : 'Connect'}
//       </button>

//       {connected && (
//         <button 
//           onClick={isRecording ? stopRecording : startRecording}
//         >
//           {isRecording ? 'Stop Recording' : 'Start Recording'}
//         </button>
//       )}
//     </div>
//   );
// };
