import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, StockAnalysisInput, GroundingSource, ConsistencyResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
System Role: Institutional Portfolio Manager & Senior Forensic Analyst (TradeLogic "The Executioner" v7.0).

LANGUAGE STYLE:
- Formal, Professional, Institutional-Grade Indonesian.
- Vocabulary: Use terms like "Liquidity Injection", "Cash Flow Divergence", "Accumulation Structure", "Institutional Sponsorship", "Retail Absorption", "Liquidity Trap".
- Tone: Objective, Deeply Analytical, High-Conviction, No Fluff.
- Avoid slang like "serok", "cuan luber". Use "Accumulate", "Profit Realization".

ANALYTICAL FRAMEWORK (THE INSTITUTIONAL LENS):

1.  **CAPITAL & LIQUIDITY LOGIC GUARD (CRITICAL - DO THIS FIRST):**
    *   **Input Validation:** Compare [User Capital] vs [Estimated Daily Transaction Value].
    *   **The Whale Rule:** If User Capital is > 1% of the stock's Daily Turnover (Volume * Price), you MUST Issue a "FORBIDDEN" Verdict.
    *   *Reasoning:* "Liquidity Trap. Your size is too big for this pool. You cannot exit without crashing the price."
    *   *Mismatch Check:* If User selected "MICRO" Tier but entered Capital > 1 Billion IDR, IGNORE the Tier label and judge based on the RAW CAPITAL AMOUNT.

2.  **Forensic Accounting (The "Litmus Test"):**
    *   Do not just read the ROE. Compare Net Income vs. CFO (Operating Cash Flow).
    *   *Rule:* If Net Income is High but CFO is Negative -> "Earnings Quality is Low (Accrual Driven)". Flag this as a major risk.
    *   *Rule:* If FCF (Free Cash Flow) is consistent -> "Cash Cow". This validates the Dividend capability.

3.  **Bandarmology & Market Structure (The "Battlefield"):**
    *   **Mapping:** Identify the dominant force.
        *   Accumulation: Top Buyer (Inst) absorbs supply from Top Seller (Retail/Mixed).
        *   Distribution: Top Buyer (Retail) absorbs supply from Top Seller (Inst).
    *   **Broker Codes:**
        *   Institutional/Smart Money: ZP (Maybank), AK (UBS), BK (JP Morgan), KZ (CLSA), RX (Macquarie), CC (Mandiri - Inst version).
        *   Retail/Noise: YP (Mirae), XL (Stockbit), PD (Indo Premier), XC (Ajaib).

4.  **Supply/Demand Dynamics (The "Tape Reading"):**
    *   Analyze the Bid/Offer thickness provided in the input.
    *   **Fake Bid:** Thick bid but price drops? -> "Spoofing / Trap".
    *   **Absorption:** Price flat but high volume on Offer? -> "Silent Accumulation".

OUTPUT REQUIREMENTS:
- **fullAnalysis:** This is the core report. Must be detailed (3-4 paragraphs). Structure it as:
    1.  *Executive Summary:* The immediate verdict based on current price action.
    2.  *Liquidity & Capital Fit:* explicitly state if the user's capital is safe for this specific stock's volume.
    3.  *Forensic Deep Dive:* The Cash Flow and Valuation audit.
    4.  *Institutional Stance:* Final decision for large capital placement.

LOGIC GUARD (MANDATORY):
- IF Capital Tier = "INSTITUTIONAL" AND Volume is Low -> VERDICT: FORBIDDEN (Liquidity Risk).
- IF CFO is Negative for >2 periods AND Price is at All Time High -> VERDICT: REDUCE/AVOID (Divergence).
`;

const tradePlanSchema = {
  type: Type.OBJECT,
  properties: {
    verdict: { type: Type.STRING },
    entry: { type: Type.STRING },
    tp: { type: Type.STRING },
    sl: { type: Type.STRING },
    reasoning: { type: Type.STRING },
    status: { type: Type.STRING, enum: ["RECOMMENDED", "POSSIBLE", "FORBIDDEN"] }
  }
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ticker: { type: Type.STRING },
    priceInfo: {
      type: Type.OBJECT,
      properties: {
        current: { type: Type.STRING },
        bandarAvg: { type: Type.STRING },
        diffPercent: { type: Type.NUMBER },
        status: { type: Type.STRING },
      }
    },
    marketCapAnalysis: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING, enum: ["Small Cap", "Mid Cap", "Big Cap", "UNKNOWN"] },
        behavior: { type: Type.STRING },
      }
    },
    supplyDemand: {
        type: Type.OBJECT,
        properties: {
            bidStrength: { type: Type.NUMBER, description: "0-100 Score of buying pressure/support thickness" },
            offerStrength: { type: Type.NUMBER, description: "0-100 Score of selling pressure/resistance thickness" },
            verdict: { type: Type.STRING, description: "Professional summary like 'INSTITUTIONAL ABSORPTION' or 'DISTRIBUTION PRESSURE'" }
        }
    },
    prediction: {
      type: Type.OBJECT,
      properties: {
        direction: { type: Type.STRING, enum: ["UP", "DOWN", "CONSOLIDATE", "UNKNOWN"] },
        probability: { type: Type.NUMBER },
        reasoning: { type: Type.STRING },
      }
    },
    stressTest: {
      type: Type.OBJECT,
      properties: {
        passed: { type: Type.BOOLEAN },
        score: { type: Type.NUMBER },
        details: { type: Type.STRING },
      }
    },
    brokerAnalysis: {
      type: Type.OBJECT,
      properties: {
        classification: { type: Type.STRING },
        insight: { type: Type.STRING },
      }
    },
    summary: { type: Type.STRING },
    bearCase: { type: Type.STRING },
    strategy: {
      type: Type.OBJECT,
      properties: {
        bestTimeframe: { type: Type.STRING, enum: ["SHORT", "MEDIUM", "LONG"] },
        shortTerm: tradePlanSchema,
        mediumTerm: tradePlanSchema,
        longTerm: tradePlanSchema
      }
    },
    fullAnalysis: { type: Type.STRING }
  },
  required: ["ticker", "priceInfo", "marketCapAnalysis", "supplyDemand", "prediction", "stressTest", "brokerAnalysis", "summary", "bearCase", "strategy", "fullAnalysis"]
};

export const analyzeStock = async (input: StockAnalysisInput): Promise<AnalysisResult> => {
  try {
    const riskInstruction = input.riskProfile === 'CONSERVATIVE' 
        ? "RISK PROFILE: CONSERVATIVE (HAWK). Penalize high PBV/PER severely if Growth is < 15%. Require positive CFO. Be skeptical of unproven breakouts." 
        : input.riskProfile === 'AGGRESSIVE'
        ? "RISK PROFILE: AGGRESSIVE (BULL). Tolerate high Valuation if Growth > 20% or Momentum is very strong. Focus on Future Value over current metrics."
        : "RISK PROFILE: BALANCED. Standard institutional weighting.";

    const prompt = `
    INSTITUTIONAL AUDIT REQUEST: ${input.ticker} @ ${input.price}
    CLIENT MANDATE: ${input.riskProfile}
    CLIENT CAPITAL: ${input.capital} IDR (Tier selected: ${input.capitalTier})
    
    [LOGIC INJECTION]
    ${riskInstruction}

    [FUNDAMENTAL DATA - AUDITED]
    ROE: ${input.fundamentals.roe}% | DER: ${input.fundamentals.der}x | PBV: ${input.fundamentals.pbv}x
    PER: ${input.fundamentals.per}x | CFO (Operating Cash): ${input.fundamentals.cfo} | FCF (Free Cash): ${input.fundamentals.fcf}
    
    [MARKET STRUCTURE DATA]
    Bandar Score: ${input.bandarmology.brokerSummaryVal} | Top Actors: ${input.bandarmology.topBrokers} | Avg Cost: ${input.bandarmology.bandarAvgPrice}
    Bid Depth: ${input.bandarmology.orderBookBid} 
    Offer Depth: ${input.bandarmology.orderBookAsk}
    Haka (Aggressive Buy): ${input.bandarmology.tradeBookAsk} 
    Haki (Aggressive Sell): ${input.bandarmology.tradeBookBid}
    
    [INTELLIGENCE REPORT]
    ${input.rawIntelligenceData}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        // DETERMINISTIC SETTINGS (THE FIX)
        temperature: 0.0, // Zero randomness
        topK: 1, // Only select the single most probable token
        topP: 0.1, // Tight probability mass
        seed: 42069, // Fixed seed for reproducibility
      }
    });

    const data = JSON.parse(response.text) as AnalysisResult;
    return { ...data, id: crypto.randomUUID(), timestamp: Date.now(), sources: [] };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

export const runConsistencyCheck = async (history: AnalysisResult[]): Promise<ConsistencyResult> => {
  const sorted = history.sort((a, b) => a.timestamp - b.timestamp);
  const prompt = `Analisa tren konsistensi untuk ${sorted[0].ticker}. Data: ${JSON.stringify(sorted)}. Gunakan bahasa profesional dan berikan outlook trend jangka panjang.`;
  
  const consistencySchema: Schema = {
    type: Type.OBJECT,
    properties: {
        ticker: { type: Type.STRING },
        dataPoints: { type: Type.NUMBER },
        trendVerdict: { type: Type.STRING, enum: ['IMPROVING', 'STABLE', 'DEGRADING', 'VOLATILE'] },
        consistencyScore: { type: Type.NUMBER },
        analysis: { type: Type.STRING },
        actionItem: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { 
        responseMimeType: "application/json", 
        responseSchema: consistencySchema,
        temperature: 0.0, // Ensure consistency check is also deterministic
        seed: 42069
    }
  });

  return JSON.parse(response.text) as ConsistencyResult;
};
