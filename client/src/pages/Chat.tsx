import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    // Listen for final transcription events
    socket.on("finalTranscription", (data: string) => {
      console.log("Received final transcription:", data);
      setTranscriptions(prev => [...prev, data]);
    });
    // Listen for sentiment prediction updates
    socket.on("sentimentUpdate", (data: any) => {
      console.log("Received sentiment update:", data);
      setPredictions(prev => [...prev, ...data]);
    });
    // Listen for generated notes events
    socket.on("notes", (data: any) => {
      console.log("Received generated notes:", data);
      setNotes((prev) => [...prev, data]);
    });
    return () => {
      socket.off("finalTranscription");
      socket.off("sentimentUpdate");
      socket.off("notes");
    };
  }, []);

  return (
    <div className="container">
      <div className="chat-container">
        <h3>Transcriptions:</h3>
        {transcriptions.map((text, index) => (
          <div key={index} className="chat-card">
            {text}
          </div>
        ))}
      </div>
      <div className="analytics-container">
        {/* <h3>Analytics Predictions:</h3>
        <pre>{JSON.stringify(predictions, null, 2)}</pre> */}
        <h3>Generated Notes:</h3>
        {notes.map((note, index) => {
          // Extract the content from the note JSON.
          const content = note?.choices?.[0]?.message?.content || note?.choices?.[0]?.text;
          return (
            <div key={index} className="note-card">
              {content ? content : "No content available"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
