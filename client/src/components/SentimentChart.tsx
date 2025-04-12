import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface SentimentDataPoint {
  time: number;       // time in seconds since the first data was received
  sentiment: number;
}

const socket = io("http://localhost:3000");

const SentimentChart: React.FC = () => {
  const [data, setData] = useState<SentimentDataPoint[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const lastEmissionRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = (initialStartTime: number) => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      if (lastEmissionRef.current && now - lastEmissionRef.current > 10000) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setElapsedTime(Math.floor((now - initialStartTime) / 1000));
      }
    }, 1000);
  };

  useEffect(() => {
    const handleSentimentUpdate = (predictions: any[]) => {
      const currentTime = Date.now();

      if (!startTime) {
        setStartTime(currentTime);
        lastEmissionRef.current = currentTime;
        startTimer(currentTime);
      } else {
        lastEmissionRef.current = currentTime;
        if (!timerRef.current && startTime) {
          startTimer(startTime);
        }
      }

      // Use either the already recorded startTime or currentTime as fallback.
      const effectiveStart = startTime || currentTime;
      // Map the incoming predictions to data points with a relative time.
      const newData: SentimentDataPoint[] = predictions.map((prediction) => ({
        time: Math.floor((currentTime - effectiveStart) / 1000),
        sentiment: prediction.sentiment,
      }));

      setData((prevData) => [...prevData, ...newData]);
    };

    socket.on("sentimentUpdate", handleSentimentUpdate);

    return () => {
      socket.off("sentimentUpdate", handleSentimentUpdate);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTime]);

  return (
    <div className="sentiment-chart" style={{ marginLeft: "50px" }}>
      <ResponsiveContainer width="90%" height="80%">
        <LineChart data={data}>
          <ReferenceLine y={5} stroke="#ccc" strokeDasharray="3 3" />
          <ReferenceLine y={1} stroke="#000" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, elapsedTime]}
            tickFormatter={(tick: number) => `${tick}s`}
            label={{ position: "bottom" }}
          />
          <YAxis
            domain={[1, 9]}
            stroke="#000"
            width={70}
            ticks={[1, 5, 9]}
            tickFormatter={(value: number) => {
              if (value === 9) return "Positive";
              if (value === 5) return "Neutral";
              if (value === 1) return "Negative";
              return "";
            }}
            label={{ angle: -90, position: "insideLeft" }}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(label: number) => `${label}s`}
            formatter={(value: number) => [
              value === 9
                ? "Positive"
                : value === 5
                ? "Neutral"
                : value === 1
                ? "Negative"
                : value,
              "Sentiment",
            ]}
          />
          <Line type="monotone" dataKey="sentiment" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentChart;
