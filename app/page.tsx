// Universal AI WEB HUB — Obsidian Glass Edition
// by Volkan Kücükbudak
// Apache 2 + ESOL 1.1
"use client";
import { useState, useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage  { role: string; content: string; }
interface FileCache    { name: string; type: 'text' | 'image' | 'error'; content: string; }
interface HubConfig {
  hf_token: string;
  hub_url: string;
  default_provider: string;
  default_model: string;
  default_tool: string;
}

// ── File handling (browser — parity with hub.py where possible) ────────────
const SUPPORTED_TEXT = [
  'txt','py','js','ts','jsx','tsx','html','css','php',
  'json','xml','md','sql','sh','c','cpp','java','rb','go','rs','kt','swift','csv'
];

async function processBrowserFile(file: File): Promise<FileCache> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();

  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type: 'image', content: e.target?.result as string, name: file.name });
      r.readAsDataURL(file);
    });
  }
  if (SUPPORTED_TEXT.includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type: 'text', content: e.target?.result as string, name: file.name });
      r.readAsText(file);
    });
  }
  if (ext === 'pdf')  return { type: 'error', content: 'PDF: use desktop client (hub.py)', name: file.name };
  if (ext === 'zip')  return { type: 'error', content: 'ZIP: use desktop client (hub.py)', name: file.name };
  if (ext === 'xlsx') return { type: 'error', content: 'XLSX: use desktop client (hub.py)', name: file.name };
  return { type: 'error', content: `Unsupported: .${ext}`, name: file.name };
}

// ── Small components ───────────────────────────────────────────────────────
function GlowDot({ on }: { on: boolean }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
      background: on ? '#7fffb2' : '#ff4e6a',
      boxShadow: on ? '0 0 8px 2px #7fffb299' : '0 0 8px 2px #ff4e6a88',
    }} />
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.015) 100%)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 12,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 8px 32px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';
  return (
    <div style={{ display:'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom:12, animation:'fadeUp .22s ease' }}>
      {!isUser && (
        <div style={{
          width:28,height:28,borderRadius:8,flexShrink:0,marginRight:8,marginTop:2,
          background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:12,fontWeight:700,color:'#fff',boxShadow:'0 2px 8px rgba(94,74,252,.4)',
        }}>⬡</div>
      )}
      <div style={{
        maxWidth: '72%', padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isError
          ? 'rgba(255,78,106,.12)'
          : isUser
            ? 'linear-gradient(135deg,rgba(94,74,252,.35),rgba(167,139,250,.2))'
            : 'rgba(255,255,255,.05)',
        border: isError
          ? '1px solid rgba(255,78,106,.3)'
          : isUser ? '1px solid rgba(167,139,250,.3)' : '1px solid rgba(255,255,255,.07)',
        fontSize:13, lineHeight:1.6, color: isError ? '#ff8ca0' : '#e2e8f0',
        fontFamily:"'JetBrains Mono','Fira Code',monospace",
        whiteSpace:'pre-wrap', wordBreak:'break-word',
        boxShadow: isUser ? '0 4px 16px rgba(94,74,252,.15)' : 'none',
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width:28,height:28,borderRadius:8,flexShrink:0,marginLeft:8,marginTop:2,
          background:'linear-gradient(135deg,#1e1e2e,#312e5a)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:12,fontWeight:700,color:'#a78bfa',
          border:'1px solid rgba(167,139,250,.25)',
        }}>▶</div>
      )}
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:8 }}>
      <div style={{
        width:28,height:28,borderRadius:8,flexShrink:0,
        background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:12,color:'#fff',fontWeight:700,
      }}>⬡</div>
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:7,height:7,borderRadius:'50%',display:'inline-block',
            background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
            animation:`pulse 1.2s ease-in-out ${i*.2}s infinite`,
          }} />
        ))}
        <span style={{ color:'#6b7280', fontSize:11, marginLeft:4, fontFamily:'monospace' }}>Hub processing…</span>
      </div>
    </div>
  );
}

function HubSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ color:'#6b7280', fontSize:11, fontFamily:'monospace', letterSpacing:'.04em', textTransform:'uppercase' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
        borderRadius:6, padding:'3px 8px', color:'#c4b5fd', fontSize:11,
        fontFamily:'monospace', outline:'none', cursor:'pointer',
      }}>
        {options.map(o => <option key={o} value={o} style={{ background:'#1a1625' }}>{o}</option>)}
      </select>
    </div>
  );
}

function Field({ label, type='text', value, onChange, placeholder='' }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{
        display:'block', marginBottom:6, color:'#6b7280', fontSize:11,
        fontFamily:'monospace', letterSpacing:'.06em', textTransform:'uppercase',
      }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width:'100%', boxSizing:'border-box',
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8, padding:'10px 14px', color:'#e2e8f0',
          fontSize:13, fontFamily:'monospace', outline:'none', transition:'border .15s',
        }}
        onFocus={e => (e.target.style.border = '1px solid rgba(167,139,250,.5)')}
        onBlur={e  => (e.target.style.border = '1px solid rgba(255,255,255,.1)')}
      />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
const TABS = ['chat','tools','connect','settings'] as const;
type Tab = typeof TABS[number];
const TAB_ICON: Record<Tab, string> = { chat:'◈', tools:'⬡', connect:'⬢', settings:'◉' };

export default function VolkanNextHub() {

  // --- STATE (full parity with hub.py) ---
  const [tab,             setTab]             = useState<Tab>('chat');
  const [connected,       setConnected]       = useState<boolean>(false);
  const [statusText,      setStatusText]      = useState<string>('not connected');
  const [config,          setConfig]          = useState<HubConfig>({
    hf_token:'', hub_url:'', default_provider:'', default_model:'', default_tool:'llm_complete',
  });
  const [tools,           setTools]           = useState<string[]>([]);
  const [providers,       setProviders]       = useState<string[]>(['default']);
  const [models,          setModels]          = useState<string[]>(['default']);
  const [selectedTool,    setSelectedTool]    = useState<string>('llm_complete');
  const [selectedProvider,setSelectedProvider]= useState<string>('default');
  const [selectedModel,   setSelectedModel]   = useState<string>('default');
  const [chat,            setChat]            = useState<ChatMessage[]>([]);
  const [input,           setInput]           = useState<string>('');
  const [loading,         setLoading]         = useState<boolean>(false);
  const [fileCache,       setFileCache]       = useState<FileCache | null>(null);
  const [toolsJson,       setToolsJson]       = useState<string>('');
  const [dragging,        setDragging]        = useState<boolean>(false);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CONFIG PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('mcp_config');
    if (saved) {
      const p: HubConfig = JSON.parse(saved);
      setConfig(p);
      setSelectedTool(p.default_tool || 'llm_complete');
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, loading]);

  const saveSettings = () => {
    localStorage.setItem('mcp_config', JSON.stringify(config));
    sysMsg('Settings saved to browser storage.');
  };

  // --- HELPERS ---
  const sysMsg = (text: string) =>
    setChat(prev => [...prev, { role: 'hub', content: `◉ System: ${text}` }]);

  const cfgSet = (k: keyof HubConfig) => (v: string) =>
    setConfig(c => ({ ...c, [k]: v }));

  // --- NETWORKING ---
  const fetchTools = async () => {
    if (!config.hub_url || !config.hf_token) {
      sysMsg('Configure Hub URL + HF Token in Settings first.'); return;
    }
    setStatusText('connecting…'); setConnected(false);
    try {
      const res  = await fetch(`${config.hub_url.replace(/\/$/,'')}/api`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.hf_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'list_active_tools', params: {} }),
      });
      const data   = await res.json();
      const result = data.result || data;
      const t = result.active_tools        || [];
      const p = ['default', ...(result.active_llm_providers || [])];
      const m = ['default', ...(result.available_models     || [])];
      setTools(t); setProviders(p); setModels(m);
      setConnected(true); setStatusText('connected');
      setToolsJson(JSON.stringify(result, null, 2));
      sysMsg(`Connected — ${t.length} tools · ${p.length-1} providers · ${m.length-1} models`);
      setTab('chat');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusText('connection failed'); setConnected(false);
      sysMsg(`Connection failed: ${msg}`);
    }
  };

  const sendChat = async () => {
    if (!input.trim() || loading) return;

    let fullPrompt = input;
    if (fileCache?.type === 'text')
      fullPrompt = `${input}\n\n[File Content — ${fileCache.name}]\n${fileCache.content}`;

    const userContent = fileCache
      ? `▶ [${selectedTool}]: ${input}\n📎 ${fileCache.name}`
      : `▶ [${selectedTool}]: ${input}`;

    setChat(prev => [...prev, { role: 'user', content: userContent }]);
    setInput(''); setLoading(true); setFileCache(null);

    try {
      const toolParams = selectedTool === 'db_query'
        ? { sql: fullPrompt }
        : {
            prompt:        fullPrompt,
            provider_name: selectedProvider === 'default' ? config.default_provider : selectedProvider,
            model:         selectedModel    === 'default' ? config.default_model    : selectedModel,
            max_tokens:    1024,
          };

      const res  = await fetch(`${config.hub_url.replace(/\/$/,'')}/api`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.hf_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedTool, params: toolParams }),
      });
      const data     = await res.json();
      const response = data.result || data.error || JSON.stringify(data);
      setChat(prev => [...prev, {
        role: 'hub',
        content: `⬡ Hub [${selectedTool}]: ${typeof response === 'object' ? JSON.stringify(response, null, 2) : response}`,
      }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setChat(prev => [...prev, { role: 'error', content: `Connection error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  // --- FILE HANDLING ---
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const result = await processBrowserFile(file);
    if (result.type === 'error') sysMsg(`File: ${result.content}`);
    else setFileCache(result);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0d0b14;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes orbFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-30px) scale(1.05)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,.25);border-radius:2px}
        select option{background:#1a1625;color:#e2e8f0}
      `}</style>

      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column',
        background:'#0d0b14', fontFamily:"'JetBrains Mono','Fira Code',monospace",
        color:'#e2e8f0', position:'relative', overflow:'hidden',
      }}>

        {/* Background */}
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{
            position:'absolute', width:600, height:600, borderRadius:'50%',
            top:'-20%', left:'-10%',
            background:'radial-gradient(circle,rgba(94,74,252,.12) 0%,transparent 70%)',
            animation:'orbFloat 12s ease-in-out infinite',
          }} />
          <div style={{
            position:'absolute', width:400, height:400, borderRadius:'50%',
            bottom:'-10%', right:'-5%',
            background:'radial-gradient(circle,rgba(167,139,250,.09) 0%,transparent 70%)',
            animation:'orbFloat 16s ease-in-out infinite reverse',
          }} />
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'radial-gradient(rgba(167,139,250,.04) 1px,transparent 1px)',
            backgroundSize:'32px 32px',
          }} />
        </div>

        {/* ── HEADER ── */}
        <header style={{
          position:'relative', zIndex:10,
          background:'rgba(13,11,20,.85)',
          borderBottom:'1px solid rgba(167,139,250,.12)',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          padding:'10px 20px', display:'flex', flexWrap:'wrap',
          alignItems:'center', gap:16,
          boxShadow:'0 1px 0 rgba(167,139,250,.06),0 4px 24px rgba(0,0,0,.4)',
        }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginRight:8 }}>
            <div style={{
              width:32, height:32, borderRadius:8, flexShrink:0,
              background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:16, fontWeight:700, color:'#fff',
              boxShadow:'0 0 16px rgba(94,74,252,.5)',
            }}>⬡</div>
            <div>
              <div style={{
                fontSize:13, fontWeight:700, letterSpacing:'.08em',
                fontFamily:"'Syne',sans-serif",
                background:'linear-gradient(90deg,#a78bfa,#7dd3fc,#a78bfa)',
                backgroundSize:'200% auto',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                animation:'shimmer 4s linear infinite',
              }}>UNIVERSAL AI HUB</div>
              <div style={{ fontSize:9, color:'#4b5563', letterSpacing:'.12em', textTransform:'uppercase' }}>
                by Volkan Kücükbudak
              </div>
            </div>
          </div>

          <HubSelect label="Tool"     value={selectedTool}     onChange={setSelectedTool}     options={tools.length>0 ? tools : ['llm_complete']} />
          <HubSelect label="Provider" value={selectedProvider} onChange={setSelectedProvider} options={providers} />
          <HubSelect label="Model"    value={selectedModel}    onChange={setSelectedModel}    options={models} />

          <div style={{
            marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
            background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
            borderRadius:20, padding:'4px 12px',
            fontSize:10, fontFamily:'monospace', letterSpacing:'.08em',
            color: connected ? '#7fffb2' : '#ff8ca0',
          }}>
            <GlowDot on={connected} />
            {statusText}
          </div>
        </header>

        {/* ── TABS ── */}
        <nav style={{
          position:'relative', zIndex:10,
          background:'rgba(13,11,20,.7)',
          borderBottom:'1px solid rgba(167,139,250,.08)',
          backdropFilter:'blur(12px)', display:'flex', padding:'0 20px',
        }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'12px 20px', fontSize:11, fontFamily:'monospace',
              letterSpacing:'.1em', textTransform:'uppercase',
              cursor:'pointer', background:'none', border:'none', outline:'none',
              borderBottom: tab===t ? '2px solid #a78bfa' : '2px solid transparent',
              color: tab===t ? '#c4b5fd' : '#4b5563',
              transition:'all .15s', display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ fontSize:14 }}>{TAB_ICON[t]}</span>{t}
            </button>
          ))}
        </nav>

        {/* ── CONTENT ── */}
        <main style={{
          flex:1, display:'flex', flexDirection:'column',
          padding:20, position:'relative', zIndex:5, overflow:'hidden',
        }}>

          {/* ── CHAT ── */}
          {tab === 'chat' && (
            <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 160px)' }}>
              <Panel style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', marginBottom:12 }}>
                <div style={{ flex:1, overflowY:'auto', padding:'20px 16px' }}>
                  {chat.length === 0 && (
                    <div style={{ textAlign:'center', padding:'60px 20px' }}>
                      <div style={{ fontSize:48, marginBottom:16, filter:'drop-shadow(0 0 24px rgba(94,74,252,.6))' }}>⬡</div>
                      <div style={{ fontSize:16, fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#c4b5fd', marginBottom:8 }}>
                        Universal AI Hub
                      </div>
                      <div style={{ fontSize:12, color:'#4b5563', lineHeight:1.8 }}>
                        Settings → Connect → Chat<br/>
                        Supports: text, code, CSV, JSON, MD, images<br/>
                        PDF / ZIP → use desktop client (hub.py)
                      </div>
                    </div>
                  )}
                  {chat.map((m, i) => <Bubble key={i} msg={m} />)}
                  {loading && <Typing />}
                  <div ref={chatEndRef} />
                </div>
              </Panel>

              {fileCache && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8, marginBottom:8,
                  padding:'6px 12px',
                  background:'rgba(94,74,252,.1)', borderRadius:8,
                  border:'1px solid rgba(167,139,250,.2)',
                  fontSize:11, color:'#a78bfa',
                }}>
                  <span>📎</span>
                  <span>{fileCache.name}</span>
                  <span style={{ color:'#6b7280' }}>({fileCache.type})</span>
                  <button onClick={() => setFileCache(null)} style={{
                    marginLeft:'auto', background:'none', border:'none',
                    color:'#6b7280', cursor:'pointer', fontSize:14, lineHeight:'1',
                  }}>✕</button>
                </div>
              )}

              <Panel style={{ padding:'8px 8px 8px 12px' }}>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    display:'flex', gap:8, alignItems:'center',
                    outline: dragging ? '2px dashed rgba(167,139,250,.5)' : 'none',
                    borderRadius:8, padding:4,
                  }}
                >
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    style={{
                      background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
                      borderRadius:8, width:36, height:36, display:'flex',
                      alignItems:'center', justifyContent:'center',
                      cursor:'pointer', fontSize:16, flexShrink:0, color:'#6b7280',
                    }}
                  >📎</button>
                  <input
                    type="file" ref={fileInputRef} style={{ display:'none' }}
                    onChange={e => handleFile(e.target.files?.[0])}
                  />

                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                    placeholder="Enter prompt… (or drag & drop a file)"
                    style={{
                      flex:1, background:'transparent', border:'none', outline:'none',
                      color:'#e2e8f0', fontSize:13,
                      fontFamily:"'JetBrains Mono',monospace", padding:'8px 4px',
                    }}
                  />

                  <button
                    onClick={sendChat}
                    disabled={loading || !input.trim()}
                    style={{
                      background: loading || !input.trim()
                        ? 'rgba(94,74,252,.2)'
                        : 'linear-gradient(135deg,#5e4afc,#a78bfa)',
                      border:'none', borderRadius:8, padding:'8px 20px',
                      cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                      color:'#fff', fontFamily:'monospace', fontSize:12,
                      fontWeight:700, letterSpacing:'.08em', flexShrink:0,
                      boxShadow: loading||!input.trim() ? 'none' : '0 4px 16px rgba(94,74,252,.4)',
                      transition:'all .15s',
                    }}
                  >
                    {loading ? '…' : 'SEND ▶'}
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {/* ── TOOLS ── */}
          {tab === 'tools' && (
            <div style={{ maxWidth:800, margin:'0 auto', width:'100%' }}>
              <Panel style={{ padding:20 }}>
                <div style={{ fontSize:11, color:'#6b7280', marginBottom:16, fontFamily:'monospace', letterSpacing:'.08em', textTransform:'uppercase' }}>
                  Active Tools from Hub
                </div>
                {tools.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px 0', color:'#4b5563', fontSize:12 }}>
                    No tools loaded — Connect first
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:20 }}>
                    {tools.map(t => (
                      <button key={t} onClick={() => { setSelectedTool(t); setTab('chat'); }} style={{
                        padding:'12px 14px',
                        background:'rgba(94,74,252,.07)', border:'1px solid rgba(167,139,250,.15)',
                        borderRadius:8, cursor:'pointer',
                        display:'flex', alignItems:'center', gap:8,
                        fontSize:12, color:'#c4b5fd', fontFamily:'monospace',
                        transition:'background .15s', textAlign:'left',
                      }}>
                        <span style={{ color:'#5e4afc', fontWeight:700 }}>⬡</span>{t}
                      </button>
                    ))}
                  </div>
                )}
                {toolsJson && (
                  <>
                    <div style={{ fontSize:11, color:'#6b7280', marginBottom:8, letterSpacing:'.08em', textTransform:'uppercase' }}>Raw Response</div>
                    <pre style={{
                      background:'rgba(0,0,0,.3)', borderRadius:8, padding:14,
                      fontSize:11, color:'#7fffb2', overflowX:'auto',
                      maxHeight:300, overflowY:'auto',
                      border:'1px solid rgba(127,255,178,.1)', fontFamily:'monospace',
                    }}>{toolsJson}</pre>
                  </>
                )}
              </Panel>
            </div>
          )}

          {/* ── CONNECT ── */}
          {tab === 'connect' && (
            <div style={{ maxWidth:480, margin:'0 auto', width:'100%', paddingTop:20 }}>
              <Panel style={{ padding:28 }}>
                <div style={{ textAlign:'center', marginBottom:28 }}>
                  <div style={{
                    width:64, height:64, borderRadius:16, margin:'0 auto 16px',
                    background: connected
                      ? 'linear-gradient(135deg,rgba(127,255,178,.15),rgba(127,255,178,.05))'
                      : 'linear-gradient(135deg,rgba(94,74,252,.2),rgba(167,139,250,.1))',
                    border: connected ? '1px solid rgba(127,255,178,.3)' : '1px solid rgba(167,139,250,.3)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:28,
                    boxShadow: connected ? '0 0 24px rgba(127,255,178,.2)' : '0 0 24px rgba(94,74,252,.2)',
                  }}>{connected ? '●' : '⬢'}</div>
                  <div style={{
                    fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15,
                    marginBottom:4, color: connected ? '#7fffb2' : '#c4b5fd',
                  }}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </div>
                  <div style={{ fontSize:11, color:'#4b5563', fontFamily:'monospace' }}>
                    {config.hub_url || 'No Hub URL configured'}
                  </div>
                </div>

                <button onClick={fetchTools} style={{
                  width:'100%', padding:'14px',
                  background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
                  border:'none', borderRadius:10, cursor:'pointer',
                  color:'#fff', fontFamily:"'Syne',sans-serif",
                  fontSize:14, fontWeight:700, letterSpacing:'.06em',
                  boxShadow:'0 4px 24px rgba(94,74,252,.45)',
                  transition:'transform .1s,box-shadow .1s', marginBottom:12,
                }}>⬢ CONNECT / REFRESH TOOLS</button>

                {connected && (
                  <div style={{
                    padding:'12px 14px', background:'rgba(127,255,178,.05)',
                    border:'1px solid rgba(127,255,178,.15)', borderRadius:8,
                    fontSize:11, fontFamily:'monospace', color:'#7fffb2', lineHeight:1.8,
                  }}>
                    <div>Tools: {tools.length}</div>
                    <div>Providers: {providers.length - 1}</div>
                    <div>Models: {models.length - 1}</div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div style={{ maxWidth:480, margin:'0 auto', width:'100%', paddingTop:20 }}>
              <Panel style={{ padding:28 }}>
                <div style={{
                  fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700,
                  color:'#c4b5fd', marginBottom:24, letterSpacing:'.04em',
                }}>◉ Configuration</div>

                <Field label="HF Token"        type="password" value={config.hf_token}         onChange={cfgSet('hf_token')}         placeholder="hf_…" />
                <Field label="Hub URL"                          value={config.hub_url}           onChange={cfgSet('hub_url')}           placeholder="https://your-space.hf.space" />
                <Field label="Default Provider"                 value={config.default_provider}  onChange={cfgSet('default_provider')}  placeholder="openai, anthropic, …" />
                <Field label="Default Model"                    value={config.default_model}     onChange={cfgSet('default_model')}     placeholder="gpt-4o, claude-3-5-sonnet…" />

                <button onClick={saveSettings} style={{
                  width:'100%', padding:'13px',
                  background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
                  border:'none', borderRadius:10, cursor:'pointer',
                  color:'#fff', fontFamily:"'Syne',sans-serif",
                  fontSize:13, fontWeight:700, letterSpacing:'.06em',
                  boxShadow:'0 4px 24px rgba(94,74,252,.4)', transition:'transform .1s',
                }}>💾 SAVE SETTINGS</button>

                <div style={{
                  marginTop:20, padding:'12px 14px',
                  background:'rgba(255,255,255,.02)',
                  border:'1px solid rgba(255,255,255,.06)',
                  borderRadius:8, fontSize:10, fontFamily:'monospace',
                  color:'#4b5563', lineHeight:2,
                }}>
                  <div style={{ color:'#6b7280', marginBottom:4 }}>Browser file support</div>
                  <div>✓ Text · Code · CSV · JSON · Markdown</div>
                  <div>✓ Images (JPEG · PNG · GIF · WebP)</div>
                  <div style={{ color:'#374151' }}>⚠ PDF · ZIP · XLSX → desktop client only</div>
                </div>
              </Panel>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
