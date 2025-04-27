// src/tools/PredictionAccumulator.ts
import type {
    StreamModelPredictionsLanguagePredictionsItem,
  } from "./models";
  
  export interface AccumulatedPrediction {
    text: string;
    timestamp: number;
    topEmotions: { name: string; score: number }[];
    sentiment: number;
  }
  
  export class PredictionAccumulator {
    private records: AccumulatedPrediction[] = [];
  
    /** Add one batch of predictions to the record list */
    addPredictions(predictions: StreamModelPredictionsLanguagePredictionsItem[]) {
      const timestamp = Date.now();
  
      predictions.forEach(p => {
        // 1) TEXT — ensure it’s always a string
        const text = p.text ?? "";
  
        // 2) EMOTIONS — normalize into an array of {name, score}
        let emotionsArray: { name: string; score: number }[] = [];
        if (Array.isArray(p.emotions)) {
          emotionsArray = p.emotions;
        } else if (p.emotions && typeof p.emotions === "object") {
          emotionsArray = Object.entries(p.emotions).map(
            ([name, score]) => ({ name, score: Number(score) })
          );
        }
        // pick top 3
        const topEmotions = emotionsArray
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
  
        // 3) SENTIMENT — extract a single numeric score
        let sentimentScore = 0;
        if (Array.isArray(p.sentiment) && p.sentiment.length) {
          sentimentScore = Number(p.sentiment[0].score);
        } else if (p.sentiment && typeof p.sentiment === "object") {
          const vals = Object.values(p.sentiment).map(v => Number((v as any)));
          if (vals.length) sentimentScore = vals[0];
        }
  
        // 4) PUSH into buffer
        this.records.push({
          text,
          timestamp,
          topEmotions,
          sentiment: sentimentScore,
        });
      });
    }
  
    /** Retrieve all accumulated records */
    getRecords(): AccumulatedPrediction[] {
      return this.records;
    }
  
    /** Clear the buffer */
    clear() {
      this.records = [];
    }
  }
  
  // shared singleton instance
  export const predictionAccumulator = new PredictionAccumulator();
  