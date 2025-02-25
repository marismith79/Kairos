export interface StreamModelPredictionsLanguage {
    predictions?: StreamModelPredictionsLanguagePredictionsItem[];
  }
  
  export interface StreamModelPredictionsLanguagePredictionsItem {
    text?: string;
    position?: TextPosition;
    emotions?: EmotionEmbedding;
    sentiment?: Sentiment;
    toxicity?: Toxicity;
    // Custom extension for tracking which user is speaking.
    speakerId?: string;
  }
  
  export interface TextPosition {
    start?: number;
    end?: number;
  }
  
  export interface EmotionEmbedding {
    [emotion: string]: number;
  }
  
  export interface Sentiment {
    score?: number;
    label?: "positive" | "neutral" | "negative";
  }
  
  export interface Toxicity {
    score?: number;
  }
  