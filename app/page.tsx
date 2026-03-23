// Universal AI WEB HUB
// by Volkan Kücükbudak 
// Under APache 2 & ESOL 1.1 and later
"use client";
import { useState, useEffect } from 'react';

export default function VolkanNextHub() {
  // --- STATE MANAGEMENT (Full parity with hub.py) ---
  const [tab, setTab] = useState('chat');
  const [status, setStatus] = useState({ text: '✗ not connected', color: 'text-red-500' });
  const [config, setConfig] = useState({ 
    hf_token: '', 
    hub_url: '', 
    default_provider: '', 
    default_model: '',
    default_tool: 'llm_complete'
  });
  
  const [tools, setTools] = useState<string[]>([]);
  const [providers, setProviders] = useState<string[]>(['default']);
  const [models, setModels] = useState<string[]>(['default']);
  const [selectedTool, setSelectedTool] = useState('llm_complete');
  const [selectedProvider, setSelectedProvider] = useState('default');
  const [selectedModel, setSelectedModel] = useState('default');
  
  const [chat, setChat] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileCache, setFileCache] = useState<{name: string, type: string, content: string} | null>(null);

  // --- CONFIG PERSISTENCE (Browser-based mcp_desktop.json) ---
  useEffect(() => {
    const saved = localStorage.getItem('mcp_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      setSelectedTool(parsed.default_tool || 'llm_complete');
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('mcp_config', JSON.stringify(config));
    alert("Settings saved to Browser LocalStorage.");
  };

  // --- NETWORKING (Async Worker Logic) ---
  const fetchTools = async () => {
    if (!config.hub_url || !config.hf_token) return;
    setStatus({ text: '… fetching tools', color: 'text-yellow-500' });
    
    try {
      const res = await fetch(`${config.hub_url.replace(/\/$/, '')}/api`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.hf_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ tool: "list_active_tools", params: {} })
      });
      const data = await res.json();
      const result = data.result || data;
      
      setTools(result.active_tools || []);
      setProviders(['default', ...(result.active_llm_providers || [])]);
      setModels(['default', ...(result.available_models || [])]);
      setStatus({ text: '● connected', color: 'text-green-500' });
    } catch (e: any) {
      setStatus({ text: '✗ fetch failed', color: 'text-red-500' });
    }
  };

  const sendChat = async () => {
    if (!input.trim() || loading) return;

    let fullPrompt = input;
    if (fileCache && fileCache.type === 'text') {
      fullPrompt = `${input}\n\n[File Content]\n${fileCache.content}`;
    }

    const userMsg = { role: 'user', content: `▶ [${selectedTool}]: ${input}` };
    setChat(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const toolParams = selectedTool === "db_query" 
        ? { sql: fullPrompt }
        : { 
            prompt: fullPrompt, 
            provider_name: selectedProvider === 'default' ? config.default_provider : selectedProvider,
            model: selectedModel === 'default' ? config.default_model : selectedModel,
            max_tokens: 1024 
          };

      const res = await fetch(`${config.hub_url.replace(/\/$/, '')}/api`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${config.hf_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ tool: selectedTool, params: toolParams })
      });
      const data = await res.json();
      const response = data.result || data.error || JSON.stringify(data);
      
      setChat(prev => [...prev, { role: 'hub', content: `⬡ Hub: ${typeof response === 'object' ? JSON.stringify(response, null, 2) : response}` }]);
    } catch (e: any) {
      setChat(prev => [...prev, { role: 'error', content: `✗ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
      setFileCache(null);
    }
  };

  // --- FILE HANDLING ---
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileCache({ 
        name: file.name, 
        type: file.type.startsWith('image/') ? 'image' : 'text', 
        content: ev.target?.result as string 
      });
    };
    file.type.startsWith('image/') ? reader.readAsDataURL(file) : reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono flex flex-col">
      {/* Header - Mirroring your PySide6 Header Bar */}
      <header className="bg-[#161b22] border-b border-[#21262d] p-2 flex flex-wrap items-center gap-4 shadow-md">
        <span className="text-[#58a6ff] font-bold px-2">⬡ Universal AI HUB</span>
        
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-gray-500">Tools:</span>
          <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)} className="bg-[#0d1117] border border-[#30363d] p-1 rounded">
            {tools.length > 0 ? tools.map(t => <option key={t}>{t}</option>) : <option>llm_complete</option>}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-gray-500">Provider:</span>
          <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="bg-[#0d1117] border border-[#30363d] p-1 rounded">
            {providers.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-gray-500">Model:</span>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="bg-[#0d1117] border border-[#30363d] p-1 rounded">
            {models.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className={`ml-auto text-[10px] font-bold uppercase ${status.color}`}>{status.text}</div>
      </header>

      {/* Tabs */}
      <nav className="flex bg-[#161b22] border-b border-[#21262d]">
        {['chat', 'tools', 'connect', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-6 py-2 text-xs uppercase ${tab === t ? 'border-b-2 border-[#58a6ff] text-[#58a6ff]' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-grow p-4 flex flex-col overflow-hidden">
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto bg-[#0d1117] border border-[#21262d] rounded p-4 mb-4 text-sm whitespace-pre-wrap">
              {chat.map((m, i) => <div key={i} className="mb-2">{m.content}</div>)}
              {loading && <div className="animate-pulse text-gray-500 italic">... Hub processing</div>}
            </div>
            {fileCache && <div className="text-[10px] text-green-500 mb-1 italic">📎 {fileCache.name} attached</div>}
            <div className="flex gap-2">
              <label className="bg-[#21262d] p-2 rounded cursor-pointer hover:bg-[#30363d]">
                📎 <input type="file" className="hidden" onChange={handleFile} />
              </label>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} className="flex-grow bg-[#161b22] border border-[#21262d] p-2 rounded outline-none" placeholder="Enter prompt..." />
              <button onClick={sendChat} className="bg-[#1f6feb] px-6 py-2 rounded font-bold hover:bg-[#388bfd]">SEND ▶</button>
            </div>
          </div>
        )}

        {tab === 'connect' && (
          <div className="max-w-md mx-auto w-full space-y-6 pt-10">
            <button onClick={fetchTools} className="w-full bg-[#238636] p-4 rounded font-bold hover:bg-[#2ea043]">🔌 CONNECT / REFRESH TOOLS</button>
            <div className="text-xs text-gray-500">Target: {config.hub_url || 'None'}</div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-md mx-auto w-full space-y-4 pt-4 text-xs">
            <div><label className="text-gray-500">HF Token</label>
            <input type="password" value={config.hf_token} onChange={e => setConfig({...config, hf_token: e.target.value})} className="w-full bg-[#161b22] border border-[#21262d] p-2 rounded mt-1" /></div>
            <div><label className="text-gray-500">Hub URL</label>
            <input type="text" value={config.hub_url} onChange={e => setConfig({...config, hub_url: e.target.value})} className="w-full bg-[#161b22] border border-[#21262d] p-2 rounded mt-1" /></div>
            <button onClick={saveSettings} className="w-full bg-[#6e40c9] p-3 rounded font-bold mt-4">💾 SAVE SETTINGS</button>
          </div>
        )}
      </main>
    </div>
  );
}
