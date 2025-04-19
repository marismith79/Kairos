import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import SentimentChart from "../components/SentimentChart";

const socket = io("http://localhost:3000");

interface ChatBubble {
  bubbleId: string;
  speakerId: string;
  text: string;
  isInterim: boolean;
  timestamp: string;
}
export default function Chat() {

  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [currentMessage, setCurrentMessage] = useState<ChatBubble | null >(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);


  
  useEffect(() => {
    // Handle new transcription starting
    socket.on("startTranscription", (data: ChatBubble) => {
      setMessages(prev => [...prev, data]);
    });
      // Listen for interim transcription events.
      socket.on("interimTranscription", (data) => {
        console.log("Received interim transcription:", data);
        setMessages(prev => {
          const newMessages = [...prev];
          const index = newMessages.findIndex(msg => msg.bubbleId === data.bubbleId);
          if (index !== -1) {
            newMessages[index] = data;
          }
          setCurrentMessage(data);
          return newMessages;
        });
      });
    // Listen for final transcription events.
    socket.on("finalTranscription", (data) => {
      console.log("Received final transcription:", data);
      setMessages(prev => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(msg => msg.bubbleId === data.bubbleId);
        if (index !== -1) {
          newMessages[index] = data;
        }
        setCurrentMessage(null);
        return newMessages;
      });
    });
  
    // Listen for top3 emotions updates, etc.
    socket.on("top3emotionsUpdate", (data: any) => {
      console.log("Received sentiment update:", data);
      setPredictions(prev => [...prev, ...data]);
    });
    // Listen for generated notes events
    socket.on("notesGenerated", (data: any) => {
      console.log("Received generated notes:", data);
      setNotes((prev) => [...prev, data]);
    });
    return () => {
      socket.off("startTranscription");
      socket.off("finalTranscription");
      socket.off("interimTranscription");
      socket.off("top3emotionsUpdate");
    };
  }, [socket]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="container">
      <div className="chat-container">
        <h3>Chat</h3>
          {/* Render bubbles from the Map */}
          {messages.map((message, index)=> (
        <div 
          key={message.bubbleId}
          className={`
            chat-card 
            ${message.isInterim ? 'interim' : 'final'}
            ${message.speakerId === 'Guest-1' ? 'left' : 'right'}
          `}
        >
          <div className="speaker-label">
            {message.speakerId}
          </div>
          <div className="bubble-content">
            <div className="text">{message.text}</div>
            <hr style={{ border: '1px solid #cccccc', margin: '5px 0' }} />
            <div style={{ fontSize: '0.9em', color: '#000000' }}>
              Top emotions: {predictions[index]?.emotions.join(', ')}
            </div>
            {message.isInterim && (
              <div className="typing-indicator">...</div>
            )}
            <div className="timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
        {currentMessage && (
          <div className="chat-card interim">
            {currentMessage.text}
          </div>
        )}
      </div>
      <div className="notes-container">
        <h3>Notes</h3>
        {notes.map((note, index) => (
          <div key={index} className="note-card">
            {note.choices[0].message.content}
          </div>
        ))}
      </div>
      <div className="sentiment-container">
        <h3>Sentiment</h3>
        <SentimentChart />
      </div>
    </div>
  );
}
