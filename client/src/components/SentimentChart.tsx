// SentimentChart.tsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { StreamModelPredictionsLanguagePredictionsItem } from "../tools/models";

interface SentimentDataPoint {
  time: number;
  score: number;
}

interface SentimentChartProps {
  predictions: StreamModelPredictionsLanguagePredictionsItem[];
}

const SentimentChart: React.FC<SentimentChartProps> = ({ predictions }) => {
  // Map predictions with a valid sentiment to data points.
  const data: SentimentDataPoint[] = predictions
    .filter(
      (item) =>
        item.sentiment && typeof item.sentiment.score === "number"
    )
    .map((item, index) => ({
      time: index, // In a full implementation, you might use timestamps.
      score: item.sentiment!.score!,
    }));

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
