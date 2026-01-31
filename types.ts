
export enum AnalysisVerdict {
  ACCUMULATE = 'ACCUMULATE',
  REDUCE = 'REDUCE',
  AVOID = 'AVOID',
  WAIT = 'WAIT & SEE'
}

export type CapitalTier = 'MICRO' | 'RETAIL' | 'HIGH_NET' | 'INSTITUTIONAL';
export type RiskProfile = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface AppConfig {
  defaultTier: CapitalTier;
  riskProfile: RiskProfile;
  userName: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface StockAnalysisInput {
  ticker: string;
  price: string;
  capital: string;
  capitalTier: CapitalTier;
  riskProfile: RiskProfile; // Added logic injection
  fundamentals: {
    roe: string;
    der: string;
    pbv: string;
    per: string;
    npm: string;
    growth: string;
    cfo: string;
    fcf: string;
  };
  bandarmology: {
    // Split OrderBook
    orderBookBid: string;
    orderBookAsk: string;
    // Split TradeBook
    tradeBookBid: string;
    tradeBookAsk: string;
    
    brokerSummaryVal: number; // 0 to 100
    topBrokers: string;
    duration: string;
    bandarAvgPrice: string;
  };
  rawIntelligenceData: string;
}

export interface TradePlan {
  verdict: string;
  entry: string;
  tp: string;
  sl: string;
  reasoning: string;
  status: 'RECOMMENDED' | 'POSSIBLE' | 'FORBIDDEN';
}

export interface AnalysisResult {
  id: string; // Unique ID for Vault
  timestamp: number; // For time-series analysis
  ticker: string;
  priceInfo: {
    current: string;
    bandarAvg: string;
    diffPercent: number;
    status: string;
  };
  marketCapAnalysis: {
    category: string;
    behavior: string;
  };
  supplyDemand: {
    bidStrength: number; // 0-100
    offerStrength: number; // 0-100
    verdict: string; // e.g., "SUPPLY OVERWHELMING"
  };
  prediction: {
    direction: 'UP' | 'DOWN' | 'CONSOLIDATE';
    probability: number;
    reasoning: string;
  };
  stressTest: {
    passed: boolean;
    score: number;
    details: string;
  };
  brokerAnalysis: {
    classification: string;
    insight: string;
  };
  summary: string;
  bearCase: string;
  
  strategy: {
    bestTimeframe: 'SHORT' | 'MEDIUM' | 'LONG';
    shortTerm: TradePlan;
    mediumTerm: TradePlan;
    longTerm: TradePlan;
  };

  fullAnalysis: string;
  sources: GroundingSource[];
}

export interface ConsistencyResult {
  ticker: string;
  dataPoints: number;
  trendVerdict: 'IMPROVING' | 'STABLE' | 'DEGRADING' | 'VOLATILE';
  consistencyScore: number; // 0-100
  analysis: string;
  actionItem: string;
}
