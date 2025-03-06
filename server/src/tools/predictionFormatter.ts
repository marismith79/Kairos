export interface RawPrediction {
    text?: string;
    position: { begin: number; end: number };
    emotions: Array<{ name: string; score: number }>;
    sentiment: Array<{ score: number }>;
    toxicity: Array<{ score: number }>;
  }
  
  export interface FormattedPrediction {
    // A single number from 1 to 9 (1 = positive, 5 = neutral, 9 = negative)
    sentiment: number;
    // Top three emotion names based on score
    emotions: string[];
    // Toxicity as a percent (0–100)
    toxicity: number;
  }
  
  export function formatPrediction(raw: RawPrediction): FormattedPrediction {
    // Determine the sentiment bucket with the highest score.
    let maxSentimentScore = -Infinity;
    let sentimentValue = 5; // default to neutral
    raw.sentiment.forEach((bucket, index) => {
      if (bucket.score > maxSentimentScore) {
        maxSentimentScore = bucket.score;
        // Use the bucket's position in the array (1-indexed) as the sentiment value.
        sentimentValue = index + 1;
      }
    });
  
    // Sort the emotions by score (highest first) and pick the top three.
    const topEmotions = raw.emotions
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(emotion => emotion.name);
  
    // Choose the toxicity bucket with the highest score.
    let maxToxicityScore = -Infinity;
    raw.toxicity.forEach(bucket => {
      if (bucket.score > maxToxicityScore) {
        maxToxicityScore = bucket.score;
      }
    });
    const toxicityPercent = Math.round(maxToxicityScore * 100);
  
    return {
      sentiment: sentimentValue,
      emotions: topEmotions,
      toxicity: toxicityPercent,
    };
  }
  
  export function formatPredictions(rawPredictions: RawPrediction[]): FormattedPrediction[] {
    return rawPredictions.map(formatPrediction);
  }
  