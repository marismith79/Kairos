import { useEffect, useState } from "react";
import io from "socket.io-client";
import SentimentChart from "../components/SentimentChart";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  
  useEffect(() => {
    // Listen for final transcription events.
    socket.on("finalTranscription", (data: string) => {
      console.log("Received final transcription:", data);
      setMessages(prev => [...prev, data]);
      setCurrentMessage("");
    });
    // Listen for interim transcription events.
    socket.on("interimTranscription", (data: string) => {
      console.log("Received interim transcription:", data);
      setCurrentMessage(data);
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
      socket.off("finalTranscription");
      socket.off("interimTranscription");
      socket.off("top3emotionsUpdate");
    };
  }, []);

  return (
    <div className="container">
      <div className="chat-container">
        <h3>Chat</h3>
        {messages.map((text, index) => (
          <div key={index} className="chat-card">
            {text}
            <hr style={{ border: '1px solid #cccccc', margin: '5px 0' }} />
            <div style={{ fontSize: '0.9em', color: '#000000' }}>
              Top emotions: {predictions[index]?.emotions.join(', ')}
            </div>
          </div>
        ))}
        {currentMessage && (
          <div className="chat-card interim">
            {currentMessage}
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
