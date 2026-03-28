export interface Alert {
  id: number;
  timestamp: string;
  detected: boolean;
  region?: string;
  confidence: number;
  description: string;
  thumbnail: string;
}

export interface FaceEntry {
  id: number;
  personId?: number;
  faceImage: string;
  fullFrame: string;
  timestamp: string;
  alertDescription: string;
  confidence: number;
}

export interface DemoStats {
  framesProcessed: number;
  alertsTriggered: number;
  detectionRate: number;
  uniquePersons: number;
}
