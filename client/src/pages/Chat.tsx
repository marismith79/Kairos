// Chat.tsx
import { useState } from "react";
import { humeService } from "../humeServiceSenti";
import Controls from "../components/Controls";
import SentimentChart from "./components/SentimentChart";
import { StreamModelPredictionsLanguagePredictionsItem } from "../tools/models";

export default function Chat() {
  const [isConnected, setIsConnected] = useState(false);
  const [predictions, setPredictions] = useState<StreamModelPredictionsLanguagePredictionsItem[]>([]);

  const apiKey = process.env.apikey || ""; // Replace with actual

  const handleStartCall = async () => {
    try {
      await humeService.connect(apiKey, (newPredictions) => {
        // Update predictions as they arrive
        setPredictions((prev) => [...prev, ...newPredictions]);
      });
      setIsConnected(true);
      console.log("Connected to WebSocket");
    } catch (error) {
      console.error("Error connecting:", error);
    }
  };

  const handleEndCall = () => {
    humeService.disconnect();
    setIsConnected(false);
    setPredictions([]);
    console.log("Disconnected from WebSocket");
  };

  return (
    <div className="container">
      <div className="analytics-container">
        <h3>Controls</h3>
        {!isConnected ? (
          <button onClick={handleStartCall}>Start Call</button>
        ) : (
          <>
            <button onClick={handleEndCall}>End Call</button>
            <Controls onEndCall={handleEndCall} />
          </>
        )}
      </div>
      <div className="sentiment-container">
        <h3>Sentiment Analysis</h3>
        <SentimentChart predictions={predictions} />
      </div>
    </div>
  );
}
