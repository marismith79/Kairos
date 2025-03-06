import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

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
    return () => {
      socket.off("finalTranscription");
      socket.off("sentimentUpdate");
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
        <h3> Analytics Predictions:</h3>
        <pre>{JSON.stringify(predictions, null, 2)}</pre>
      </div>
    </div>
  );
}
