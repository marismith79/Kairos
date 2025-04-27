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

const companyNumbers: [string] = ["+16315134330"];

export default function Chat() {
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [currentMessage, setCurrentMessage] = useState<ChatBubble | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on("startTranscription", (data: ChatBubble) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("interimTranscription", (data: ChatBubble) => {
      console.log("Received interim transcription:", data);
      setMessages((prev) => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(
          (msg) => msg.bubbleId === data.bubbleId
        );
        if (index !== -1) {
          newMessages[index] = data;
        }
        setCurrentMessage(data);
        return newMessages;
      });
    });

    socket.on("finalTranscription", (data: ChatBubble) => {
      console.log("Received final transcription:", data);
      setMessages((prev) => {
        const newMessages = [...prev];
        const index = newMessages.findIndex(
          (msg) => msg.bubbleId === data.bubbleId
        );
        if (index !== -1) {
          newMessages[index] = data;
        }
        setCurrentMessage(null);
        return newMessages;
      });
    });

    socket.on("top3emotionsUpdate", (data: any[]) => {
      console.log("Received sentiment update:", data);
      setPredictions((prev) => [...prev, ...data]);
    });

    socket.on("notesGenerated", (data: any) => {
      console.log("Received generated notes:", data);
      setNotes((prev) => [...prev, data]);
    });

    return () => {
      socket.off("startTranscription");
      socket.off("interimTranscription");
      socket.off("finalTranscription");
      socket.off("top3emotionsUpdate");
      socket.off("notesGenerated");
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="container">
      <div className="chat-container" ref={chatContainerRef}>
        <h3>Chat</h3>
        {/* Render chat bubbles */}
        {messages.map((message: ChatBubble, index: number) => (
          <div
            key={message.bubbleId}
            className={`chat-card ${message.isInterim ? "interim" : "final"} ${
               companyNumbers.includes(message.speakerId) ? "left" : "right"
            }`}
            onClick={() => {
              console.log("Message Details:", {
                speakerId: message.speakerId,
                isCompanyNumber: companyNumbers.includes(message.speakerId),
                companyNumbers: companyNumbers,
                isInterim: message.isInterim,
                bubbleId: message.bubbleId,
              });
            }}
          >
            <div className="speaker-label">{message.speakerId}</div>
            <div className="bubble-content">
              <div className="text">{message.text}</div>
              <hr style={{ border: "1px solid #cccccc", margin: "5px 0" }} />
              <div style={{ fontSize: "0.9em", color: "#000000" }}>
                Top emotions: {predictions[index]?.emotions?.join(", ")}
              </div>
              {message.isInterim && <div className="typing-indicator">...</div>}
              <div className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="notes-container">
        <h3>Notes</h3>
        {notes.map((note: any, index: number) => {
          // split the raw note text into non‑empty lines
          const content: string = note.choices[0].message.content;
          const lines: string[] = content
            .split("\n")
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);

          return (
            <div key={index} className="note-card">
              {lines.map((line: string, i: number) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sentiment-container">
        <h3>Sentiment</h3>
        <SentimentChart />
      </div>
    </div>
  );
}
