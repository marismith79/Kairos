// sentichat.tsx
import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [transcription, setTranscription] = useState<string>("");
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    // Listen for final transcription events
    socket.on("finalTranscription", (data: string) => {
      console.log("Received final transcription:", data);
      setTranscription(data);
    });
    // Listen for sentiment prediction updates
    socket.on("sentimentUpdate", (data: any) => {
      console.log("Received sentiment update:", data);
      setPredictions(prev => [...prev, ...data]);
    });
    return () => {
      socket.off("finalTranscription");
      socket.off("sentimentUpdate");
    };
  }, []);

  return (
    <div className="container">
      <div className="chat-container">
        <h3>Final Transcription:</h3>
        <p>{transcription}</p>
      </div>
      <div className="analytics-container">
        <h3>Sentiment Analysis Predictions:</h3>
        <pre>{JSON.stringify(predictions, null, 2)}</pre>
      </div>
    </div>
  );
}
