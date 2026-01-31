import React, { useState, useEffect } from 'react';
import { Loader2, LayoutGrid, Activity, Search, Bell, Menu, User, Settings, LogOut, ChevronRight, Zap, FolderOpen, PieChart, X, Info, ShieldAlert, BrainCircuit, Lock } from 'lucide-react';
import { analyzeStock, runConsistencyCheck } from './services/geminiService';
import { AnalysisResult, StockAnalysisInput, ConsistencyResult, AppConfig } from './types';
import AnalysisCard from './components/AnalysisCard';
import InputForm from './components/InputForm';
import CaseVault from './components/CaseVault';
import ConfigPanel from './components/ConfigPanel';

const DEFAULT_CONFIG: AppConfig = {
    defaultTier: 'RETAIL',
    riskProfile: 'BALANCED',
    userName: 'Trader Pro'
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'LAB' | 'VAULT' | 'CONFIG'>('LAB');
  const [vaultCases, setVaultCases] = useState<AnalysisResult[]>([]);
  
  // App Configuration State
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // Sidebar default closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  
  // Consistency Check State
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyResult | null>(null);
  const [checkingConsistency, setCheckingConsistency] = useState(false);

  // System Manifesto Modal State
  const [showManifesto, setShowManifesto] = useState(false);

  // Load from LocalStorage on mount
  useEffect(() => {
    // Load Vault
    const savedVault = localStorage.getItem('tradeLogic_cases');
    if (savedVault) {
      try {
        const parsed = JSON.parse(savedVault);
        const sanitized = parsed.map((item: any) => ({
            ...item,
            id: item.id || crypto.randomUUID(),
            timestamp: item.timestamp || Date.now()
        }));
        setVaultCases(sanitized);
      } catch (e) { console.error("Failed to load vault", e); }
    }

    // Load Config
    const savedConfig = localStorage.getItem('tradeLogic_config');
    if (savedConfig) {
        try {
            setAppConfig(JSON.parse(savedConfig));
        } catch (e) { console.error("Failed to load config", e); }
    }

    // Resize handler
    const handleResize = () => {
        if (window.innerWidth >= 768) {
            setSidebarOpen(true);
        } else {
            setSidebarOpen(false);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
      setAppConfig(newConfig);
      localStorage.setItem('tradeLogic_config', JSON.stringify(newConfig));
      alert("Mandate updated successfully.");
      setView('LAB'); // Return to lab after saving
  };

  const saveToVault = (result: AnalysisResult) => {
    const uniqueResult = {
        ...result,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
    const newCases = [uniqueResult, ...vaultCases];
    setVaultCases(newCases);
    localStorage.setItem('tradeLogic_cases', JSON.stringify(newCases));
    alert("Snapshot archived to Vault successfully.");
  };

  const removeFromVault = (id: string) => {
    const newCases = vaultCases.filter(c => c.id !== id);
    setVaultCases(newCases);
    localStorage.setItem('tradeLogic_cases', JSON.stringify(newCases));
  };

  const handleExportVault = () => {
    const dataStr = JSON.stringify(vaultCases, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tradelogic_vault_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportVault = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            const merged = [...vaultCases, ...json.map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() }))];
            setVaultCases(merged);
            localStorage.setItem('tradeLogic_cases', JSON.stringify(merged));
            alert(`Successfully imported ${json.length} cases.`);
        }
      } catch (err) {
        console.error("Import failed", err);
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAnalysisSubmit = async (data: StockAnalysisInput) => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    // Close sidebar on mobile when submitting
    if (window.innerWidth < 768) setSidebarOpen(false);
    
    try {
      // Inject current risk profile into input
      const enrichedData = { ...data, riskProfile: appConfig.riskProfile };
      const result = await analyzeStock(enrichedData);
      setAnalysis(result);
    } catch (err: any) {
      console.error(err);
      setError("Analysis Failed. Ensure all data fields are valid and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunConsistency = async (selected: AnalysisResult[]) => {
      setCheckingConsistency(true);
      try {
          const result = await runConsistencyCheck(selected);
          setConsistencyResult(result);
      } catch (err) {
          console.error(err);
          alert("Failed to run consistency check.");
      } finally {
          setCheckingConsistency(false);
      }
  };

  return (
    <div className="flex h-screen bg-black text-slate-300 overflow-hidden font-sans">
      
      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col shadow-2xl md:shadow-none`}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#1a1a1a]">
           <div className="flex items-center">
               <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-3 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  <Zap size={16} className="text-black fill-current" />
               </div>
               <span className="text-xl font-bold text-white tracking-tight">TradeLogic</span>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-white">
               <X size={24} />
           </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-8 px-4 space-y-2">
           <div className="px-4 mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">Analytics</div>
           
           <button 
             onClick={() => { setView('LAB'); setAnalysis(null); if(window.innerWidth < 768) setSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'LAB' && !analysis ? 'bg-white text-black shadow-lg shadow-white/10 font-bold' : 'text-slate-400 hover:bg-[#1a1a1a] hover:text-white'}`}
           >
             <Activity size={18} />
             <span>Forensic Lab</span>
           </button>

           <button 
             onClick={() => { setView('VAULT'); if(window.innerWidth < 768) setSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'VAULT' ? 'bg-white text-black shadow-lg shadow-white/10 font-bold' : 'text-slate-400 hover:bg-[#1a1a1a] hover:text-white'}`}
           >
             <FolderOpen size={18} />
             <span>Case Vault</span>
             {vaultCases.length > 0 && <span className="ml-auto text-xs py-0.5 px-2 bg-slate-800 text-white rounded-full">{vaultCases.length}</span>}
           </button>

           <div className="px-4 mt-8 mb-2 text-xs font-bold text-slate-600 uppercase tracking-widest">System</div>
           
           <button 
             onClick={() => { setView('CONFIG'); if(window.innerWidth < 768) setSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'CONFIG' ? 'bg-white text-black shadow-lg shadow-white/10 font-bold' : 'text-slate-400 hover:bg-[#1a1a1a] hover:text-white'}`}
           >
             <Settings size={18} />
             <span>Global Mandate</span>
           </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-[#1a1a1a]">
           <div className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-[#222]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold uppercase">
                 {appConfig.userName.substring(0, 2)}
              </div>
              <div className="flex-1 overflow-hidden">
                 <div className="text-sm font-bold text-white truncate">{appConfig.userName}</div>
                 <div className="text-xs text-slate-500 truncate">{appConfig.defaultTier} Tier</div>
              </div>
           </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen relative bg-black w-full">
         {/* Background Glows */}
         <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#111] to-black -z-10"></div>
         <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

         {/* TOPBAR */}
         <header className="h-20 px-4 md:px-8 flex items-center justify-between z-10 border-b border-[#1a1a1a] md:border-none bg-black/50 backdrop-blur-md md:bg-transparent sticky top-0 md:static">
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 text-white hover:bg-[#222] rounded-lg" onClick={() => setSidebarOpen(true)}>
                    <Menu size={24} />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    {view === 'LAB' ? (analysis ? `Report: ${analysis.ticker}` : 'New Analysis') : view === 'VAULT' ? 'Vault Archives' : 'Mandate Settings'}
                </h2>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center bg-[#111] border border-[#222] rounded-full px-4 py-2 w-64 focus-within:border-indigo-500 transition-colors">
                    <Search size={16} className="text-slate-500 mr-2" />
                    <input type="text" placeholder="Search archives..." className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-slate-600" />
                </div>
                <button 
                  onClick={() => setShowManifesto(true)}
                  className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-[#222] rounded-full"
                  title="System Manifesto"
                >
                    <Info size={20} />
                </button>
            </div>
         </header>

         {/* SCROLLABLE CONTENT */}
         <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 custom-scrollbar">
            
            {/* Conditional Rendering based on View */}
            {view === 'CONFIG' && (
                <ConfigPanel config={appConfig} onSave={handleSaveConfig} />
            )}

            {view === 'VAULT' && (
                <CaseVault 
                    cases={vaultCases} 
                    onDeleteCase={removeFromVault}
                    onLoadCase={(data) => {
                        setAnalysis(data);
                        setView('LAB');
                    }}
                    onExport={handleExportVault}
                    onImport={handleImportVault}
                    onRunConsistency={handleRunConsistency}
                />
            )}
            
            {view === 'LAB' && (
                <>
                    {/* INPUT FORM OR ANALYSIS DASHBOARD */}
                    {!analysis && !loading && (
                        <div className="max-w-5xl mx-auto pt-10">
                            <div className="text-center mb-12">
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Hello, {appConfig.userName.split(' ')[0]}.</h1>
                                <p className="text-slate-400 text-lg">
                                    Ready to audit the market? <span className="text-indigo-400 font-bold">{appConfig.riskProfile}</span> protocol active.
                                </p>
                            </div>
                            <InputForm onSubmit={handleAnalysisSubmit} loading={loading} defaultConfig={appConfig} />
                        </div>
                    )}

                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center pb-20">
                             <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 border-t-2 border-l-2 border-indigo-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-4 border-r-2 border-b-2 border-purple-500 rounded-full animate-spin animation-delay-200"></div>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-white animate-pulse">AI</div>
                             </div>
                             <h3 className="text-2xl font-bold text-white mb-2">Processing Data</h3>
                             <p className="text-slate-500">Extracting broker patterns & verifying cash flow...</p>
                        </div>
                    )}

                    {error && (
                        <div className="max-w-xl mx-auto mt-10 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
                            <h3 className="text-rose-400 font-bold mb-2">Analysis Failed</h3>
                            <p className="text-rose-200/70 mb-4">{error}</p>
                            <button onClick={() => setError(null)} className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold">Try Again</button>
                        </div>
                    )}

                    {analysis && !loading && (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                             <div className="mb-6 flex justify-between items-center">
                                <button 
                                    onClick={() => setAnalysis(null)} 
                                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
                                >
                                    <ChevronRight size={16} className="rotate-180" /> Back to Inputs
                                </button>
                             </div>
                             <AnalysisCard data={analysis} onSave={saveToVault} />
                        </div>
                    )}
                </>
            )}

         </div>
      </div>

      {/* SYSTEM MANIFESTO MODAL */}
      {showManifesto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={(e) => { if(e.target === e.currentTarget) setShowManifesto(false) }}>
            <div className="bg-[#0a0a0a] border border-[#222] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-[#222] bg-gradient-to-r from-rose-950/20 to-transparent">
                    <div className="flex items-center gap-3 text-rose-500 mb-2">
                        <ShieldAlert size={24} />
                        <span className="font-mono text-sm font-bold uppercase tracking-widest">Protocol Warning</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Musuh Terbesar Adalah Diri Sendiri</h2>
                    <p className="text-slate-400">TradeLogic adalah senjata presisi tinggi, tetapi jari di pelatuknya adalah milik Anda.</p>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="flex gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl h-fit text-indigo-400"><BrainCircuit size={24} /></div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-1">Zero-Hallucination Core</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">Sistem ini berjalan dengan temperatur 0.0. Tidak ada kreativitas, tidak ada asumsi, hanya kalkulasi deterministik murni. Jika data bilang "Jual", dia tidak akan menghibur Anda dengan harapan palsu.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl h-fit text-emerald-400"><Lock size={24} /></div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-1">Liquidity Death-Trap Protection</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">Algoritma otomatis mendeteksi jika modal Anda terlalu besar untuk volume pasar. Kami mencegah Anda menjadi "Paus di Kolam Kecil" yang tidak bisa keluar.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl h-fit text-amber-400"><ShieldAlert size={24} /></div>
                        <div>
                            <h4 className="text-lg font-bold text-white mb-1">Forensic Reality Check</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">Laba bersih bisa dimanipulasi akuntan, tapi Arus Kas Operasi (CFO) tidak bisa bohong. TradeLogic membedah kualitas laba untuk memisahkan "Emas" dari "Kuningan yang dipoles".</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[#111] border-t border-[#222] flex justify-end">
                    <button onClick={() => setShowManifesto(false)} className="px-8 py-3 bg-white hover:bg-slate-200 text-black font-bold rounded-xl text-sm transition-colors">
                        SAYA MENGERTI RISIKONYA
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CONSISTENCY MODAL (Overlay) */}
      {consistencyResult && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
               <div className="bg-[#111] border border-[#222] rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Trend Consistency</h2>
                          <p className="text-slate-500">Audit for {consistencyResult.ticker}</p>
                      </div>
                      <button onClick={() => setConsistencyResult(null)} className="p-2 hover:bg-[#222] rounded-full text-slate-400 hover:text-white transition-colors">
                          <LogOut size={20} />
                      </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#222]">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-2">Verdict</div>
                          <div className={`text-2xl font-bold ${consistencyResult.trendVerdict === 'IMPROVING' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {consistencyResult.trendVerdict}
                          </div>
                      </div>
                      <div className="p-4 bg-[#0a0a0a] rounded-xl border border-[#222]">
                          <div className="text-xs text-slate-500 font-bold uppercase mb-2">Score</div>
                          <div className="text-2xl font-bold text-white">{consistencyResult.consistencyScore}/100</div>
                      </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed mb-6 p-4 bg-[#0a0a0a] rounded-xl border border-[#222] text-sm">
                      {consistencyResult.analysis}
                  </p>

                  <div className="flex justify-end">
                      <button onClick={() => setConsistencyResult(null)} className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
                          Close Audit
                      </button>
                  </div>
               </div>
          </div>
      )}
      
      {checkingConsistency && (
        <div className="fixed inset-0 z-[101] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <Loader2 size={48} className="text-white animate-spin mb-4" />
            <p className="text-white font-bold">Running historical audit...</p>
        </div>
      )}

    </div>
  );
}