import React, { useState, useMemo, useEffect } from 'react';
import { StockAnalysisInput, CapitalTier, AppConfig } from '../types';
import { ChevronRight, Info, AlertCircle, Lock, Wallet, ShieldCheck, Zap, RotateCcw, AlertTriangle } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: StockAnalysisInput) => void;
  loading: boolean;
  defaultConfig?: AppConfig; 
}

const DRAFT_KEY = 'tradeLogic_formDraft';

const CAPITAL_ADVICE = {
  MICRO: { 
    label: "Micro", 
    sub: "< 100 Juta", 
    limit: 100000000,
    color: "emerald", 
    icon: <Zap size={18} />, 
    advice: "Strategic Focus: High Agility.", 
    detail: "Modal cair. Masuk/keluar cepat (Scalping) tanpa mengganggu harga pasar." 
  },
  RETAIL: { 
    label: "Retail", 
    sub: "100jt - 500jt", 
    limit: 500000000,
    color: "blue", 
    icon: <Wallet size={18} />, 
    advice: "Strategic Focus: Growth.", 
    detail: "Bangun portofolio Swing. Hati-hati dengan likuiditas saham gorengan." 
  },
  HIGH_NET: { 
    label: "High Net", 
    sub: "500jt - 5M", 
    limit: 5000000000,
    color: "purple", 
    icon: <ShieldCheck size={18} />, 
    advice: "Strategic Focus: Asset Preservation.", 
    detail: "Wajib perhatikan Likuiditas (Bid/Offer). Jangan HAKA membabi buta." 
  },
  INSTITUTIONAL: { 
    label: "Whale", 
    sub: "> 5 Miliar", 
    limit: 999999999999999,
    color: "amber", 
    icon: <Lock size={18} />, 
    advice: "Strategic Focus: Dominance.", 
    detail: "Entry Anda menggerakkan harga. Wajib analisa Fundamental & Cash Flow." 
  }
};

const INITIAL_STATE: StockAnalysisInput = {
    ticker: '', price: '', capital: '', capitalTier: 'RETAIL', riskProfile: 'BALANCED',
    fundamentals: { roe: '', der: '', pbv: '', per: '', npm: '', growth: '', cfo: '', fcf: '' },
    bandarmology: { orderBookBid: '', orderBookAsk: '', tradeBookBid: '', tradeBookAsk: '', brokerSummaryVal: 50, topBrokers: '', duration: '', bandarAvgPrice: '' },
    rawIntelligenceData: ''
};

const StyledInput = ({ label, value, onChange, type = "text", placeholder, width = "full", error }: any) => (
  <div className={`${width === 'half' ? '' : 'w-full'}`}>
      <div className="flex justify-between">
        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">{label}</label>
        {error && <span className="text-[10px] font-bold text-rose-500 uppercase animate-pulse">{error}</span>}
      </div>
      <input 
          type={type}
          className={`w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white font-medium text-sm placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-[#111] transition-all ${value === '' ? '' : 'border-indigo-500/30'} ${error ? 'border-rose-500 focus:border-rose-500' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
      />
  </div>
);

const InputForm: React.FC<InputFormProps> = ({ onSubmit, loading, defaultConfig }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<StockAnalysisInput>(INITIAL_STATE);
  
  // Logic Guard State
  const [capitalWarning, setCapitalWarning] = useState<string | null>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
        try {
            const parsed = JSON.parse(savedDraft);
            setFormData(prev => ({ ...prev, ...parsed }));
        } catch (e) { console.error("Failed to load draft"); }
    } else if (defaultConfig) {
        setFormData(prev => ({
            ...prev,
            capitalTier: defaultConfig.defaultTier,
            riskProfile: defaultConfig.riskProfile
        }));
    }
  }, []); 

  // Watch for config changes
  useEffect(() => {
      if (defaultConfig && !localStorage.getItem(DRAFT_KEY)) {
          setFormData(prev => ({ ...prev, capitalTier: defaultConfig.defaultTier, riskProfile: defaultConfig.riskProfile }));
      }
  }, [defaultConfig]);

  // CAPITAL VALIDATION LOGIC
  useEffect(() => {
    if (!formData.capital) {
        setCapitalWarning(null);
        return;
    }

    const amount = parseFloat(formData.capital);
    const tier = formData.capitalTier;
    
    // Check Micro Mismatch
    if (tier === 'MICRO' && amount > 150000000) {
        setCapitalWarning("CRITICAL: Nominal modal terlalu besar untuk Tier MICRO.");
    } 
    // Check Retail Mismatch
    else if (tier === 'RETAIL' && amount > 600000000) {
        setCapitalWarning("WARNING: Modal Anda mendekati High Net Worth. Pertimbangkan upgrade Tier.");
    }
    // Check Whale Mismatch (Too Small)
    else if (tier === 'INSTITUTIONAL' && amount < 1000000000) {
        setCapitalWarning("INVALID: Tier Institutional butuh modal minimal 1 Miliar.");
    }
    else {
        setCapitalWarning(null);
    }
  }, [formData.capital, formData.capitalTier]);

  useEffect(() => {
    if (formData !== INITIAL_STATE) localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  const handleReset = () => {
      if (confirm("Reset all inputs?")) {
          setFormData({
              ...INITIAL_STATE,
              capitalTier: defaultConfig?.defaultTier || 'RETAIL',
              riskProfile: defaultConfig?.riskProfile || 'BALANCED'
          });
          localStorage.removeItem(DRAFT_KEY);
          setStep(1);
      }
  };

  const handleChange = (section: keyof StockAnalysisInput | null, field: string, value: any) => {
    if (section && typeof formData[section] === 'object') {
      setFormData(prev => ({ ...prev, [section]: { ...prev[section] as any, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const isStepValid = (s: number) => {
      if (s === 1) return formData.ticker && formData.price && formData.capital;
      if (s === 2) return Object.values(formData.fundamentals).every(v => v !== '');
      if (s === 3) return formData.bandarmology.topBrokers && formData.bandarmology.bandarAvgPrice;
      if (s === 4) return formData.rawIntelligenceData.length > 50;
      return false;
  };

  const renderStep1 = () => {
    const activeAdvice = CAPITAL_ADVICE[formData.capitalTier];
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="grid grid-cols-2 gap-6">
              <StyledInput label="Ticker" value={formData.ticker} onChange={(e: any) => handleChange(null, 'ticker', e.target.value.toUpperCase())} placeholder="BBCA" />
              <StyledInput label="Price" type="number" value={formData.price} onChange={(e: any) => handleChange(null, 'price', e.target.value)} placeholder="Current Price" />
          </div>
          
          <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">Capital Tier</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {(Object.keys(CAPITAL_ADVICE) as CapitalTier[]).map((tier) => {
                      const info = CAPITAL_ADVICE[tier];
                      const active = formData.capitalTier === tier;
                      return (
                          <button key={tier} type="button" onClick={() => handleChange(null, 'capitalTier', tier)}
                              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${active ? 'bg-white text-black border-white ring-2 ring-indigo-500/20' : 'bg-[#1a1a1a] border-[#333] text-slate-400 hover:border-[#555]'}`}>
                              <div className="flex items-center gap-2 mb-1 text-sm font-bold">{info.icon} {info.label}</div>
                              <div className="text-[10px] opacity-70 font-mono">{info.sub}</div>
                          </button>
                      )
                  })}
              </div>

              {/* Dynamic Advice Card */}
              <div className={`p-5 rounded-xl border transition-all duration-300 bg-${activeAdvice.color}-500/5 border-${activeAdvice.color}-500/20`}>
                 <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-${activeAdvice.color}-500/10 text-${activeAdvice.color}-400 shrink-0`}>
                        <Info size={18} />
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold text-${activeAdvice.color}-400 mb-1`}>{activeAdvice.advice}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{activeAdvice.detail}</p>
                    </div>
                 </div>
              </div>
          </div>

          <div>
            <StyledInput 
                label="Total Capital (IDR)" 
                value={formData.capital} 
                onChange={(e: any) => handleChange(null, 'capital', e.target.value)} 
                placeholder="Ex: 100000000" 
                error={capitalWarning}
            />
            {capitalWarning && (
                <div className="mt-2 flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                    <AlertTriangle size={14} />
                    {capitalWarning}
                </div>
            )}
          </div>
      </div>
    );
  };

  const renderStep2 = () => (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-right-4">
          {['roe', 'der', 'pbv', 'per', 'npm', 'growth'].map((field) => (
              <StyledInput key={field} label={field} value={(formData.fundamentals as any)[field]} onChange={(e: any) => handleChange('fundamentals', field, e.target.value)} placeholder="0.0" />
          ))}
          <div className="col-span-2 md:col-span-2 grid grid-cols-2 gap-4">
              <StyledInput label="CFO (Operating Cash)" value={formData.fundamentals.cfo} onChange={(e: any) => handleChange('fundamentals', 'cfo', e.target.value)} placeholder="Billions" />
              <StyledInput label="FCF (Free Cash)" value={formData.fundamentals.fcf} onChange={(e: any) => handleChange('fundamentals', 'fcf', e.target.value)} placeholder="Billions" />
          </div>
      </div>
  );

  const renderStep3 = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="p-4 bg-[#1a1a1a] rounded-xl border border-[#333]">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-4 text-slate-500">
                  <span>Distribution</span><span>Neutral</span><span>Accumulation</span>
              </div>
              <input type="range" min="0" max="100" className="w-full h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white" value={formData.bandarmology.brokerSummaryVal} onChange={(e) => handleChange('bandarmology', 'brokerSummaryVal', parseInt(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <StyledInput label="Top Brokers" value={formData.bandarmology.topBrokers} onChange={(e: any) => handleChange('bandarmology', 'topBrokers', e.target.value.toUpperCase())} placeholder="ZP, AK, BK" />
              <StyledInput label="Avg Price" type="number" value={formData.bandarmology.bandarAvgPrice} onChange={(e: any) => handleChange('bandarmology', 'bandarAvgPrice', e.target.value)} placeholder="Avg Price" />
              <div className="col-span-2"><StyledInput label="Duration" value={formData.bandarmology.duration} onChange={(e: any) => handleChange('bandarmology', 'duration', e.target.value)} placeholder="Last 3 Months" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              {['orderBookBid', 'orderBookAsk'].map(field => (
                  <div key={field} className="bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">{field.replace('orderBook', '')}</label>
                      <textarea className="w-full bg-transparent border-none text-white font-mono text-xs h-24 outline-none resize-none placeholder:text-slate-700" placeholder="Paste volume..." value={(formData.bandarmology as any)[field]} onChange={(e) => handleChange('bandarmology', field, e.target.value)} />
                  </div>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
              {['tradeBookBid', 'tradeBookAsk'].map(field => (
                  <div key={field} className="bg-[#1a1a1a] p-3 rounded-xl border border-[#333]">
                      <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">{field.includes('Bid') ? 'Haki' : 'Haka'}</label>
                      <textarea className="w-full bg-transparent border-none text-white font-mono text-xs h-16 outline-none resize-none placeholder:text-slate-700" value={(formData.bandarmology as any)[field]} onChange={(e) => handleChange('bandarmology', field, e.target.value)} />
                  </div>
              ))}
          </div>
      </div>
  );

  const renderStep4 = () => (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-2 p-3 bg-amber-900/10 border border-amber-900/30 rounded-lg text-amber-500 text-xs">
              <AlertCircle size={14} /> <span>Mandatory: Paste raw data containing market cap, volume, etc.</span>
          </div>
          <textarea className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-slate-300 font-mono text-xs outline-none h-64 resize-none focus:border-indigo-500" placeholder="Paste full report..." value={formData.rawIntelligenceData} onChange={(e) => handleChange(null, 'rawIntelligenceData', e.target.value)} />
      </div>
  );

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (isStepValid(1) && isStepValid(2) && isStepValid(3) && isStepValid(4)) onSubmit(formData); }} className="bg-[#111] border border-[#222] rounded-3xl p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
              {[1, 2, 3, 4].map(s => (
                  <div key={s} onClick={() => setStep(s)} className={`h-1.5 w-12 rounded-full cursor-pointer transition-all ${step === s ? 'bg-white' : s < step ? 'bg-indigo-500' : 'bg-[#333]'}`}></div>
              ))}
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{step === 1 ? 'Identity' : step === 2 ? 'Metrics' : step === 3 ? 'Bandarmology' : 'Intelligence'}</div>
      </div>

      <div className="min-h-[400px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
      </div>

      <div className="flex justify-between pt-6 border-t border-[#222] mt-6">
          <button type="button" onClick={handleReset} className="text-slate-500 hover:text-white text-xs font-bold uppercase flex items-center gap-2"><RotateCcw size={14}/> Reset</button>
          <div className="flex gap-3">
              {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-6 py-3 bg-[#1a1a1a] hover:bg-[#252525] text-white rounded-xl font-bold text-sm">Back</button>}
              {step < 4 ? 
                  <button type="button" disabled={!isStepValid(step)} onClick={() => setStep(step + 1)} className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 ${isStepValid(step) ? 'bg-white text-black hover:bg-slate-200' : 'bg-[#222] text-slate-600 cursor-not-allowed'}`}>Next <ChevronRight size={16}/></button> :
                  <button type="submit" disabled={loading || !isStepValid(4)} className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 ${!loading && isStepValid(4) ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-[#222] text-slate-600'}`}>{loading ? 'Processing...' : 'Run Analysis'}</button>
              }
          </div>
      </div>
    </form>
  );
};
export default InputForm;