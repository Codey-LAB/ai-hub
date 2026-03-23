"use client";
import { useState, useEffect, useRef } from 'react';

export default function VolkanNextHub() {
  // State-Management wie in deiner PySide6 GUI
  const [tab, setTab] = useState('chat');
  const [status, setStatus] = useState({ text: '✗ disconnected', color: 'text-red-500' });
  const [config, setConfig] = useState({ url: '', token: '', provider: '', model: '' });
  const [tools, setTools] = useState<string[]>(['llm_complete']);
  const [chat, setChat] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{name: string, content: string} | null>(null);

  // Load Config on Start (Lokal wie deine .json Datei)
  useEffect(() => {
    const savedUrl = localStorage.getItem('mcp_url') || '';
    const savedToken = localStorage.getItem('mcp_token') || '';
    setConfig(prev => ({ ...prev, url: savedUrl, token: savedToken }));
  }, []);

  const log = (msg: string) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

  // --- ACTIONS (Analog zu deiner hub.py) ---

  const saveSettings = () => {
    localStorage.setItem('mcp_url', config.url);
    localStorage.setItem('mcp_token', config.token);
    alert("Settings lokal im Browser gespeichert!");
    log("Settings saved.");
  };

  const connect = async () => {
    if (!config.url || !config.token) return alert("Bitte URL und Token in Settings eingeben!");
    setStatus({ text: '… connecting', color: 'text-yellow-500' });
    
    try {
      const res = await fetch(`${config.url.replace(/\/$/, '')}/api`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: "list_active_tools", params: {} })
      });
      const data = await res.json();
      const activeTools = data.result?.active_tools || [];
      setTools(activeTools);
      setStatus({ text: '● connected', color: 'text-green-500' });
      log("Tools geladen: " + activeTools.join(', '));
      setTab('chat');
    } catch (e: any) {
      setStatus({ text: '✗ connection failed', color: 'text-red-500' });
      log("Error: " + e.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({ name: file.name, content: content });
      log(`Datei geladen: ${file.name}`);
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file); // Base64 wie in deinem encode_image
    } else {
      reader.readAsText(file); // Text-Extraktion
    }
  };

  const sendChat = async () => {
    if (!input.trim() || loading) return;
    
    let fullPrompt = input;
    if (attachedFile) {
        fullPrompt += `\n\n[Anhang: ${attachedFile.name}]\n${attachedFile.content}`;
    }

    const newChat = [...chat, { role: 'user', content: input }];
    setChat(newChat);
    setInput('');
    setLoading(true);
    setAttachedFile(null);

    try {
      const res = await fetch(`${config.url.replace(/\/$/, '')}/api`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tool: "llm_complete", 
            params: { prompt: fullPrompt, provider_name: config.provider, model: config.model } 
        })
      });
      const data = await res.json();
      setChat([...newChat, { role: 'hub', content: data.result || JSON.stringify(data) }]);
    } catch (e: any) {
      setChat([...newChat, { role: 'error', content: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-mono flex flex-col">
      {/* Header Bar - Exakt wie in deiner hub.py */}
      <header className="bg-[#161b22] border-b border-[#21262d] p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[#58a6ff] font-bold">⬡ Universal MCP Web</span>
          <select className="bg-[#0d1117] border border-[#30363d] text-xs p-1 rounded">
            {tools.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <span className={`text-[10px] uppercase font-bold ${status.color}`}>{status.text}</span>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex bg-[#161b22] border-b border-[#21262d]">
        {['chat', 'connect', 'settings'].map(t => (
          <button 
            key={t} onClick={() => setTab(t)}
            className={`px-6 py-2 text-xs uppercase tracking-wider ${tab === t ? 'border-b-2 border-[#58a6ff] text-[#58a6ff]' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-4 overflow-hidden flex flex-col">
        
        {tab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto mb-4 space-y-3 p-2 border border-[#21262d] rounded bg-[#0d1117]">
              {chat.map((m, i) => (
                <div key={i} className={`p-2 rounded ${m.role === 'user' ? 'text-green-400' : 'text-blue-300 border-l border-blue-900 pl-4'}`}>
                  <span className="opacity-50 text-[10px] block">{m.role.toUpperCase()}</span>
                  {m.content}
                </div>
              ))}
              {loading && <div className="animate-pulse text-gray-500">Hub denkt nach...</div>}
            </div>
            
            {attachedFile && (
              <div className="text-[10px] text-green-500 mb-1 italic">📎 {attachedFile.name} geladen</div>
            )}
            
            <div className="flex gap-2">
              <label className="cursor-pointer bg-[#21262d] p-2 rounded hover:bg-[#30363d]">
                📎 <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              <input 
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Frag deinen Hub..." 
                className="flex-grow bg-[#161b22] border border-[#21262d] p-2 rounded outline-none focus:border-[#58a6ff]"
              />
              <button onClick={sendChat} className="bg-[#1f6feb] px-4 py-2 rounded font-bold">SEND</button>
            </div>
          </div>
        )}

        {tab === 'connect' && (
          <div className="max-w-md mx-auto w-full pt-10 text-center">
            <h2 className="mb-4 text-gray-400">Hub Verbindung</h2>
            <button onClick={connect} className="w-full bg-[#238636] p-4 rounded-xl font-bold hover:bg-[#2ea043] transition-all">
               🔌 JETZT VERBINDEN
            </button>
            <p className="mt-4 text-[10px] text-gray-500 italic">Lädt Tools, Provider und Modelle vom Hub.</p>
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-md mx-auto w-full space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">HuggingFace Token</label>
              <input type="password" value={config.token} onChange={e => setConfig({...config, token: e.target.value})} className="w-full bg-[#161b22] border border-[#21262d] p-2 rounded" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Hub URL</label>
              <input type="text" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full bg-[#161b22] border border-[#21262d] p-2 rounded" />
            </div>
            <button onClick={saveSettings} className="w-full bg-[#6e40c9] p-2 rounded font-bold hover:bg-[#8957e5]">💾 SPEICHERN</button>
          </div>
        )}

      </main>
    </div>
  );
}
