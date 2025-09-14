export interface MaterialThreshold {
  inventory: number;
  threshold: number;
}

export interface MaterialThresholds {
  [key: string]: MaterialThreshold;
}

export interface PlanetThreshold {
  storeId: string;
  planetName: string;
  naturalI: string;
  thresholds: MaterialThresholds;
}
