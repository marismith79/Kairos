import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SentimentUpdate {
  sentiment: {
    score: number;
    label?: "positive" | "neutral" | "negative";
  }
}

interface SentimentDataPoint {
  time: number;
  score: number;
}

const socket = io("http://localhost:3000");

const SentimentChart: React.FC = () => {
  const [data, setData] = useState<SentimentDataPoint[]>([]);

  useEffect(() => {
    // Listen for sentiment updates from the server.
    socket.on("sentimentUpdate", (sentiments: SentimentUpdate[]) => {
      console.log("Received sentiment update:", sentiments);
      // Map predictions with valid sentiment scores to data points.
      const newData: SentimentDataPoint[] = sentiments
        .filter(item => typeof item.sentiment.score === "number")
        .map((item) => ({
          time: Date.now(), // Using current timestamp; modify as needed.
          score: item.sentiment.score,
        }));

      // Update the state with new sentiment data.
      setData(prevData => [...prevData, ...newData]);
    });

    // Cleanup the event listener on component unmount.
    return () => {
      socket.off("sentimentUpdate");
    };
  }, []);

  return (
    <LineChart width={600} height={300} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" label={{ value: "Time", position: "insideBottomRight", offset: 0 }} />
      <YAxis domain={[-1, 1]} label={{ value: "Sentiment Score", angle: -90, position: "insideLeft" }} />
      <Tooltip />
      <Line type="monotone" dataKey="score" stroke="#8884d8" dot={false} />
    </LineChart>
  );
};

export default SentimentChart;
