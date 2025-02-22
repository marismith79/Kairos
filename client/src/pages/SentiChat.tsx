// THIS PAGE WAS CREATED STRICTLY TO TEST FOR THE IMPLEMENTATION OF THE LANGUAGE PROCESSING FUNCTIONALITY
import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3000");

export default function Chat() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const example = 
  "The sky is filled with infinite possibilities. Nothing much matters in the swirling haze of time. A gentle whisper echoes through the silence of the day. In a realm of abstract dreams, thoughts meander like a lazy river. The simplicity of existence holds an enigma without explanation. Words dissolve into meaningless murmurs that wander in a void.And so, the journey continues in a cycle of empty reflections.";

  // Subscribe to sentiment updates and store them in state.
  useEffect(() => {
    socket.on("sentimentUpdate", (data: any) => {
      console.log("Received sentiment update:", data);
      setPredictions(prev => [...prev, ...data]);
    });
    return () => {
      socket.off("sentimentUpdate");
    };
  }, []);

  // Trigger the connection endpoint
  const handleConnectSocket = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/connect", {
        method: "POST",
      });
      if (response.ok) {
        console.log("Socket connection triggered successfully");
      } else {
        console.error("Error connecting socket:", response.statusText);
      }
    } catch (error) {
      console.error("Error connecting socket:", error);
    }
  };

  // Trigger the processText endpoint
  const handleSendText = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/processText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: example }),
      });
      if (response.ok) {
        console.log("Text sent successfully");
      } else {
        console.error("Error sending text:", response.statusText);
      }
    } catch (error) {
      console.error("Error sending text:", error);
    }
  };

  return (
    <div className="container">
      <div className="chat-container">
        <button onClick={handleConnectSocket}>Connect Socket</button>
        <button onClick={handleSendText}>Send Text</button>
      </div>
      <div className="analytics-container"></div>
      <div className="sentiment-container">
        <h3>Sentiment Analysis</h3>
        <pre>{JSON.stringify(predictions, null, 2)}</pre>
      </div>
    </div>
  );
}
