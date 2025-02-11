// models.ts

export interface StreamModelPredictionsLanguage {
    predictions?: StreamModelPredictionsLanguagePredictionsItem[];
  }
  
  export interface StreamModelPredictionsLanguagePredictionsItem {
    text?: string; // a segment of text (e.g., word or sentence)
    position?: TextPosition;
    emotions?: EmotionEmbedding;
    sentiment?: Sentiment;
    toxicity?: Toxicity;
    // Custom extension for tracking which user is speaking.
    speakerId?: string;
  }
  
  export interface TextPosition {
    // Example: start and end times (or character indices)
    start?: number;
    end?: number;
  }
  
  export interface EmotionEmbedding {
    // For example, a mapping of emotion name to confidence score.
    [emotion: string]: number;
  }
  
  export interface Sentiment {
    // Example: a sentiment score (e.g. between -1 and 1) and a label.
    score?: number;
    label?: "positive" | "neutral" | "negative";
  }
  
  export interface Toxicity {
    score?: number;
  }
  