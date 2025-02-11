import { StreamModelPredictionsLanguage } from "./models";

export function parseStreamModelPredictionsLanguage(data: any): StreamModelPredictionsLanguage {
  // In production, you could validate more thoroughly.
  return data as StreamModelPredictionsLanguage;
}
