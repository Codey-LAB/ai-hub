// =============================================================================
// <ai-hub>
// Universal AI WEB HUB — Obsidian Glass Edition
// Copyright 2026 Volkan Kücükbudak
// https://github.com/VolkanSah/Universal-MCP-Hub-sandboxed
//
// Licensed under Apache License 2.0 AND ESOL 1.1 (and later)
// You may not remove this header or misrepresent authorship.
// Forks must retain attribution to Volkan Kücükbudak.
// </ai-hub>
// =============================================================================
"use client";
import { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// <ai-hub:types>
// =============================================================================
interface ChatMessage {
  role: 'user' | 'hub' | 'error';
  content: string;
  ts: number;
}
interface ChatSession {
  id: string;
  title: string;
  tool: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
interface FileCache {
  name: string;
  type: 'text' | 'image' | 'error';
  content: string;
}
interface HubConfig {
  hf_token: string;
  hub_url: string;
  default_provider: string;
  default_model: string;
  default_tool: string;
  hf_space_url: string;
  github_url: string;
  version: string;
}
// </ai-hub:types>

// =============================================================================
// <ai-hub:constants>
// =============================================================================
const APP_VERSION = '2.0.0';
const STORAGE_KEY = 'mcp_config';
const CHATS_KEY   = 'mcp_chats';

const SUPPORTED_TEXT = [
  'txt','py','js','ts','jsx','tsx','html','css','php',
  'json','xml','md','sql','sh','c','cpp','java','rb',
  'go','rs','kt','swift','csv',
];

const DEFAULT_CONFIG: HubConfig = {
  hf_token:'', hub_url:'', default_provider:'', default_model:'',
  default_tool:'llm_complete', hf_space_url:'',
  github_url:'https://github.com/VolkanSah/Universal-MCP-Hub-sandboxed',
  version: APP_VERSION,
};
// </ai-hub:constants>

// =============================================================================
// <ai-hub:file-handler>
// Browser file handler — parity with hub.py where browser APIs allow.
// PDF / ZIP / XLSX require the desktop client (hub.py).
// =============================================================================
async function processBrowserFile(file: File): Promise<FileCache> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type:'image', content: e.target?.result as string, name: file.name });
      r.readAsDataURL(file);
    });
  }
  if (SUPPORTED_TEXT.includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type:'text', content: e.target?.result as string, name: file.name });
      r.readAsText(file);
    });
  }
  if (['pdf','zip','xlsx'].includes(ext))
    return { type:'error', content:`${ext.toUpperCase()} needs desktop client (hub.py)`, name: file.name };
  return { type:'error', content:`Unsupported: .${ext}`, name: file.name };
}
// </ai-hub:file-handler>

// =============================================================================
// <ai-hub:export>
// =============================================================================
function exportSession(session: ChatSession, format: 'json' | 'txt' | 'csv') {
  let content = '';
  let mime    = 'text/plain';
  const ext   = format;

  if (format === 'json') {
    content = JSON.stringify(session, null, 2);
    mime    = 'application/json';
  } else if (format === 'txt') {
    content  = `# ${session.title}\n`;
    content += `Tool: ${session.tool} | ${new Date(session.createdAt).toLocaleString()}\n\n`;
    content += session.messages.map(m =>
      `[${m.role.toUpperCase()}] ${new Date(m.ts).toLocaleTimeString()}\n${m.content}`
    ).join('\n\n---\n\n');
  } else {
    mime    = 'text/csv';
    content = 'role,timestamp,content\n' +
      session.messages.map(m =>
        `"${m.role}","${new Date(m.ts).toISOString()}","${m.content.replace(/"/g,'""')}"`
      ).join('\n');
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `hub-chat-${session.id}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
// </ai-hub:export>

// =============================================================================
// <ai-hub:ui-primitives>
// =============================================================================
function GlowDot({ on }: { on: boolean }) {
  return (
    <span style={{
      display:'inline-block', width:8, height:8, borderRadius:'50%', flexShrink:0,
      background: on ? '#7fffb2' : '#ff4e6a',
      boxShadow: on ? '0 0 8px 2px #7fffb299' : '0 0 8px 2px #ff4e6a88',
    }} />
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:'linear-gradient(135deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.015) 100%)',
      border:'1px solid rgba(255,255,255,.08)', borderRadius:12,
      backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)',
      boxShadow:'0 8px 32px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06)',
      ...style,
    }}>{children}</div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser  = msg.role === 'user';
  const isError = msg.role === 'error';
  return (
    <div style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', marginBottom:12, animation:'fadeUp .22s ease' }}>
      {!isUser && (
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0, marginRight:8, marginTop:2,
          background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, color:'#fff', boxShadow:'0 2px 8px rgba(94,74,252,.4)',
        }}>⬡</div>
      )}
      <div style={{
        maxWidth:'72%', padding:'10px 14px',
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
        <div style={{ fontSize:9, color:'rgba(255,255,255,.2)', marginTop:4, textAlign:'right' }}>
          {new Date(msg.ts).toLocaleTimeString()}
        </div>
      </div>
      {isUser && (
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0, marginLeft:8, marginTop:2,
          background:'linear-gradient(135deg,#1e1e2e,#312e5a)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:700, color:'#a78bfa',
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
        width:28, height:28, borderRadius:8, flexShrink:0,
        background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, color:'#fff', fontWeight:700,
      }}>⬡</div>
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        {[0,1,2].map(i=>(
          <span key={i} style={{
            width:7, height:7, borderRadius:'50%', display:'inline-block',
            background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
            animation:`pulse 1.2s ease-in-out ${i*.2}s infinite`,
          }}/>
        ))}
        <span style={{ color:'#6b7280', fontSize:11, marginLeft:4, fontFamily:'monospace' }}>Hub processing…</span>
      </div>
    </div>
  );
}

function HubSelect({ label, value, onChange, options }: {
  label:string; value:string; onChange:(v:string)=>void; options:string[];
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ color:'#6b7280', fontSize:11, fontFamily:'monospace', letterSpacing:'.04em', textTransform:'uppercase' }}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
        borderRadius:6, padding:'3px 8px', color:'#c4b5fd', fontSize:11,
        fontFamily:'monospace', outline:'none', cursor:'pointer',
      }}>
        {options.map(o=><option key={o} value={o} style={{ background:'#1a1625' }}>{o}</option>)}
      </select>
    </div>
  );
}

function Field({ label, type='text', value, onChange, placeholder='' }: {
  label:string; type?:string; value:string; onChange:(v:string)=>void; placeholder?:string;
}) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{
        display:'block', marginBottom:6, color:'#6b7280', fontSize:11,
        fontFamily:'monospace', letterSpacing:'.06em', textTransform:'uppercase',
      }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e=>onChange(e.target.value)}
        style={{
          width:'100%', boxSizing:'border-box',
          background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8, padding:'10px 14px', color:'#e2e8f0',
          fontSize:13, fontFamily:'monospace', outline:'none', transition:'border .15s',
        }}
        onFocus={e=>(e.target.style.border='1px solid rgba(167,139,250,.5)')}
        onBlur={e=>(e.target.style.border='1px solid rgba(255,255,255,.1)')}
      />
    </div>
  );
}
// </ai-hub:ui-primitives>

// =============================================================================
// <ai-hub:sidebar>
// =============================================================================
function Sidebar({
  open, sessions, activeId, tools, providers, models,
  selectedTool, selectedProvider, selectedModel,
  onSelectSession, onNewChat, onDeleteSession,
  onSelectTool, onSelectProvider, onSelectModel, onExport, config,
}: {
  open:boolean; sessions:ChatSession[]; activeId:string; tools:string[];
  providers:string[]; models:string[];
  selectedTool:string; selectedProvider:string; selectedModel:string;
  onSelectSession:(id:string)=>void; onNewChat:()=>void;
  onDeleteSession:(id:string)=>void; onSelectTool:(t:string)=>void;
  onSelectProvider:(p:string)=>void; onSelectModel:(m:string)=>void;
  onExport:(id:string,fmt:'json'|'txt'|'csv')=>void; config:HubConfig;
}) {
  const [exportOpen, setExportOpen] = useState<string|null>(null);

  return (
    <div style={{
      width: open ? 260 : 0,
      minWidth: open ? 260 : 0,
      overflow:'hidden',
      transition:'width .25s ease, min-width .25s ease',
      display:'flex', flexDirection:'column',
      background:'rgba(13,11,20,.92)',
      borderLeft:'1px solid rgba(167,139,250,.1)',
      backdropFilter:'blur(24px)',
      flexShrink:0,
    }}>
      <div style={{ width:260, display:'flex', flexDirection:'column', height:'100%', padding:'12px 0' }}>

        {/* New Chat */}
        <div style={{ padding:'0 12px 12px' }}>
          <button onClick={onNewChat} style={{
            width:'100%', padding:'9px 14px',
            background:'linear-gradient(135deg,rgba(94,74,252,.25),rgba(167,139,250,.15))',
            border:'1px solid rgba(167,139,250,.25)', borderRadius:8,
            color:'#c4b5fd', fontSize:12, fontFamily:'monospace',
            cursor:'pointer', letterSpacing:'.06em', fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>◈ NEW CHAT</button>
        </div>

        {/* Chat History label */}
        <div style={{ padding:'0 12px 6px' }}>
          <div style={{ fontSize:9, color:'#4b5563', letterSpacing:'.1em', textTransform:'uppercase' }}>
            Chat History ({sessions.length})
          </div>
        </div>

        {/* Sessions list */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 8px' }}>
          {sessions.length===0 && (
            <div style={{ fontSize:11, color:'#374151', padding:'8px', fontFamily:'monospace' }}>No chats yet</div>
          )}
          {[...sessions].sort((a,b)=>b.updatedAt-a.updatedAt).map(s=>(
            <div key={s.id} style={{
              marginBottom:2, borderRadius:8,
              background: s.id===activeId ? 'rgba(94,74,252,.2)' : 'transparent',
              border: s.id===activeId ? '1px solid rgba(167,139,250,.2)' : '1px solid transparent',
              transition:'all .15s',
            }}>
              <div style={{ display:'flex', alignItems:'center' }}>
                <button onClick={()=>onSelectSession(s.id)} style={{
                  flex:1, padding:'8px 10px', background:'none', border:'none',
                  cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{
                    fontSize:12, color: s.id===activeId ? '#c4b5fd' : '#9ca3af',
                    fontFamily:'monospace', whiteSpace:'nowrap', overflow:'hidden',
                    textOverflow:'ellipsis', maxWidth:140,
                  }}>{s.title}</div>
                  <div style={{ fontSize:9, color:'#4b5563', marginTop:2 }}>
                    {s.tool} · {new Date(s.updatedAt).toLocaleDateString()}
                  </div>
                </button>

                {/* Export */}
                <div style={{ position:'relative', flexShrink:0 }}>
                  <button onClick={()=>setExportOpen(exportOpen===s.id?null:s.id)} style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:'#4b5563', fontSize:13, padding:'4px 5px',
                  }} title="Export">↓</button>
                  {exportOpen===s.id && (
                    <div style={{
                      position:'absolute', right:0, top:'100%', zIndex:100,
                      background:'#1a1625', border:'1px solid rgba(167,139,250,.2)',
                      borderRadius:8, overflow:'hidden', minWidth:72,
                      boxShadow:'0 8px 24px rgba(0,0,0,.5)',
                    }}>
                      {(['json','txt','csv'] as const).map(fmt=>(
                        <button key={fmt} onClick={()=>{ onExport(s.id,fmt); setExportOpen(null); }} style={{
                          display:'block', width:'100%', padding:'7px 12px',
                          background:'none', border:'none', cursor:'pointer',
                          color:'#c4b5fd', fontSize:11, fontFamily:'monospace', textAlign:'left',
                        }}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(94,74,252,.2)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}
                        >.{fmt}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button onClick={()=>onDeleteSession(s.id)} style={{
                  background:'none', border:'none', cursor:'pointer',
                  color:'#374151', fontSize:11, padding:'4px 6px', flexShrink:0,
                }}
                  onMouseEnter={e=>(e.currentTarget.style.color='#ff4e6a')}
                  onMouseLeave={e=>(e.currentTarget.style.color='#374151')}
                  title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'rgba(255,255,255,.05)', margin:'12px 12px' }}/>

        {/* Tool Shortcuts */}
        <div style={{ padding:'0 12px 8px' }}>
          <div style={{ fontSize:9, color:'#4b5563', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>
            Tool Shortcuts
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {(tools.length>0?tools:['llm_complete']).slice(0,8).map(t=>(
              <button key={t} onClick={()=>onSelectTool(t)} style={{
                padding:'4px 8px', fontSize:10, fontFamily:'monospace',
                background: selectedTool===t ? 'rgba(94,74,252,.3)' : 'rgba(255,255,255,.04)',
                border: selectedTool===t ? '1px solid rgba(167,139,250,.4)' : '1px solid rgba(255,255,255,.08)',
                borderRadius:6, color: selectedTool===t ? '#c4b5fd' : '#6b7280',
                cursor:'pointer', transition:'all .15s',
              }}>{t.replace('llm_','').replace(/_/g,' ')}</button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height:1, background:'rgba(255,255,255,.05)', margin:'8px 12px' }}/>

        {/* Active Config */}
        <div style={{ padding:'0 12px 12px' }}>
          <div style={{ fontSize:9, color:'#4b5563', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>
            Active Config
          </div>
          {/* Provider dropdown */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9,color:'#4b5563',fontFamily:'monospace',marginBottom:4,letterSpacing:'.06em',textTransform:'uppercase' }}>Provider</div>
            <select value={selectedProvider} onChange={e=>onSelectProvider(e.target.value)} style={{
              width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
              borderRadius:6,padding:'5px 8px',color:'#c4b5fd',fontSize:11,
              fontFamily:'monospace',outline:'none',cursor:'pointer',
            }}>
              {providers.map(p=>(
                <option key={p} value={p} style={{ background:'#1a1625' }}>{p}</option>
              ))}
            </select>
          </div>
          {/* Model dropdown */}
          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:9,color:'#4b5563',fontFamily:'monospace',marginBottom:4,letterSpacing:'.06em',textTransform:'uppercase' }}>Model</div>
            <select value={selectedModel} onChange={e=>onSelectModel(e.target.value)} style={{
              width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
              borderRadius:6,padding:'5px 8px',color:'#c4b5fd',fontSize:11,
              fontFamily:'monospace',outline:'none',cursor:'pointer',
            }}>
              {models.map(m=>(
                <option key={m} value={m} style={{ background:'#1a1625' }}>{m}</option>
              ))}
            </select>
          </div>
          {/* Active tool info */}
          <div style={{ display:'flex',justifyContent:'space-between',marginTop:4 }}>
            <span style={{ fontSize:10,color:'#4b5563',fontFamily:'monospace' }}>Tool</span>
            <span style={{ fontSize:10,color:'#a78bfa',fontFamily:'monospace',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{selectedTool}</span>
          </div>
          {config.hub_url && (
            <div style={{ marginTop:6,fontSize:9,color:'#374151',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              {config.hub_url}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// </ai-hub:sidebar>

// =============================================================================
// <ai-hub:footer>
// =============================================================================
function Footer({ config, sessionCount, msgCount }: {
  config:HubConfig; sessionCount:number; msgCount:number;
}) {
  return (
    <footer style={{
      position:'relative', zIndex:10,
      background:'rgba(13,11,20,.9)',
      borderTop:'1px solid rgba(167,139,250,.08)',
      backdropFilter:'blur(12px)',
      padding:'10px 24px',
      display:'flex', flexWrap:'wrap', alignItems:'center',
      justifyContent:'space-between', gap:12,
      fontSize:10, fontFamily:'monospace', color:'#4b5563', flexShrink:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'#5e4afc', fontWeight:700, fontSize:12, textShadow:'0 0 8px rgba(94,74,252,.5)' }}>⬡</span>
          <span style={{ color:'#6b7280' }}>Universal AI HUB</span>
          <span style={{
            padding:'1px 6px', background:'rgba(94,74,252,.15)',
            border:'1px solid rgba(94,74,252,.3)', borderRadius:4,
            color:'#7c6dd8', fontSize:9,
          }}>v{config.version||APP_VERSION}</span>
        </div>
        <span style={{ color:'#374151' }}>by Volkan Kücükbudak</span>
      </div>

      <div style={{ display:'flex', gap:16, color:'#374151' }}>
        <span>{sessionCount} chats stored</span>
        <span>{msgCount} messages</span>
        <span style={{
          padding:'1px 6px', background:'rgba(255,255,255,.03)',
          border:'1px solid rgba(255,255,255,.06)', borderRadius:4, color:'#4b5563',
        }}>Apache 2.0 + ESOL 1.1</span>
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
        {config.github_url && (
          <a href={config.github_url} target="_blank" rel="noopener noreferrer" style={{
            color:'#4b5563', textDecoration:'none', transition:'color .15s',
          }}
            onMouseEnter={e=>(e.currentTarget.style.color='#a78bfa')}
            onMouseLeave={e=>(e.currentTarget.style.color='#4b5563')}
          >↗ GitHub</a>
        )}
        {config.hf_space_url && (
          <a href={config.hf_space_url} target="_blank" rel="noopener noreferrer" style={{
            color:'#4b5563', textDecoration:'none', transition:'color .15s',
          }}
            onMouseEnter={e=>(e.currentTarget.style.color='#7dd3fc')}
            onMouseLeave={e=>(e.currentTarget.style.color='#4b5563')}
          >↗ HuggingFace</a>
        )}
        <span style={{ color:'#374151' }}>© 2026</span>
      </div>
    </footer>
  );
}
// </ai-hub:footer>

// =============================================================================
// <ai-hub:main>
// =============================================================================
const TABS = ['chat','tools','connect','settings'] as const;
type Tab = typeof TABS[number];
const TAB_ICON: Record<Tab,string> = { chat:'◈', tools:'⬡', connect:'⬢', settings:'◉' };

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

export default function VolkanNextHub() {

  const [tab,              setTab]              = useState<Tab>('chat');
  const [connected,        setConnected]        = useState<boolean>(false);
  const [statusText,       setStatusText]       = useState<string>('not connected');
  const [config,           setConfig]           = useState<HubConfig>(DEFAULT_CONFIG);
  const [tools,            setTools]            = useState<string[]>([]);
  const [providers,        setProviders]        = useState<string[]>(['default']);
  const [models,           setModels]           = useState<string[]>(['default']);
  const [selectedTool,     setSelectedTool]     = useState<string>('llm_complete');
  const [selectedProvider, setSelectedProvider] = useState<string>('default');
  const [selectedModel,    setSelectedModel]    = useState<string>('default');
  const [sessions,         setSessions]         = useState<ChatSession[]>([]);
  const [activeId,         setActiveId]         = useState<string>('');
  const [input,            setInput]            = useState<string>('');
  const [loading,          setLoading]          = useState<boolean>(false);
  const [fileCache,        setFileCache]        = useState<FileCache|null>(null);
  const [toolsJson,        setToolsJson]        = useState<string>('');
  const [dragging,         setDragging]         = useState<boolean>(false);
  const [sidebarOpen,      setSidebarOpen]      = useState<boolean>(true);

  const chatEndRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence bootstrap ---
  useEffect(() => {
    const cfg = localStorage.getItem(STORAGE_KEY);
    if (cfg) {
      const p: HubConfig = JSON.parse(cfg);
      setConfig(p);
      setSelectedTool(p.default_tool || 'llm_complete');
    }
    const raw = localStorage.getItem(CHATS_KEY);
    if (raw) {
      const s: ChatSession[] = JSON.parse(raw);
      setSessions(s);
      const latest = [...s].sort((a,b)=>b.updatedAt-a.updatedAt)[0];
      if (latest) setActiveId(latest.id);
    } else {
      const id = genId();
      const s: ChatSession = { id, title:'New Chat', tool:'llm_complete', messages:[], createdAt:Date.now(), updatedAt:Date.now() };
      setSessions([s]);
      setActiveId(id);
      localStorage.setItem(CHATS_KEY, JSON.stringify([s]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [sessions, activeId, loading]);

  // --- Session helpers ---
  const persistSessions = (s: ChatSession[]) => {
    setSessions(s);
    localStorage.setItem(CHATS_KEY, JSON.stringify(s));
  };

  const activeSession  = sessions.find(s=>s.id===activeId) ?? null;
  const activeMessages = activeSession?.messages ?? [];

  const newChat = useCallback(() => {
    const id = genId();
    const s: ChatSession = { id, title:'New Chat', tool:'llm_complete', messages:[], createdAt:Date.now(), updatedAt:Date.now() };
    setSessions(prev => { const n=[s,...prev]; localStorage.setItem(CHATS_KEY,JSON.stringify(n)); return n; });
    setActiveId(id);
  }, []);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setSessions(prev => {
      const n = prev.map(s => {
        if (s.id !== activeId) return s;
        const msgs  = [...s.messages, msg];
        const title = s.messages.length===0 && msg.role==='user'
          ? msg.content.replace(/▶.*?:\s*/,'').slice(0,36) || 'New Chat'
          : s.title;
        return { ...s, messages:msgs, title, updatedAt:Date.now() };
      });
      localStorage.setItem(CHATS_KEY, JSON.stringify(n));
      return n;
    });
  }, [activeId]);

  const deleteSession = (id: string) => {
    const n = sessions.filter(s=>s.id!==id);
    persistSessions(n);
    if (activeId===id) {
      if (n.length>0) setActiveId([...n].sort((a,b)=>b.updatedAt-a.updatedAt)[0].id);
      else newChat();
    }
  };

  const sysMsg  = (text: string) => appendMessage({ role:'hub', content:`◉ System: ${text}`, ts:Date.now() });
  const cfgSet  = (k: keyof HubConfig) => (v: string) => setConfig(c=>({...c,[k]:v}));
  const saveSettings = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); sysMsg('Settings saved.'); };

  // --- Networking ---
  const fetchTools = async () => {
    if (!config.hub_url||!config.hf_token) { sysMsg('Configure Hub URL + HF Token in Settings first.'); return; }
    setStatusText('connecting…'); setConnected(false);
    try {
      const res    = await fetch(`${config.hub_url.replace(/\/$/,'')}/api`, {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${config.hf_token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ tool:'list_active_tools', params:{} }),
      });
      const data   = await res.json();
      const result = data.result || data;
      const t = result.active_tools || [];
      const p = ['default',...(result.active_llm_providers||[])];
      const m = ['default',...(result.available_models||[])];
      setTools(t); setProviders(p); setModels(m);
      setConnected(true); setStatusText('connected');
      setToolsJson(JSON.stringify(result,null,2));
      sysMsg(`Connected — ${t.length} tools · ${p.length-1} providers · ${m.length-1} models`);
      setTab('chat');
    } catch(e:unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusText('connection failed'); setConnected(false);
      sysMsg(`Connection failed: ${msg}`);
    }
  };

  const sendChat = async () => {
    if (!input.trim()||loading) return;
    let fullPrompt = input;
    if (fileCache?.type==='text') fullPrompt=`${input}\n\n[File: ${fileCache.name}]\n${fileCache.content}`;
    const userContent = fileCache
      ? `▶ [${selectedTool}]: ${input}\n📎 ${fileCache.name}`
      : `▶ [${selectedTool}]: ${input}`;
    appendMessage({ role:'user', content:userContent, ts:Date.now() });
    setInput(''); setLoading(true); setFileCache(null);
    try {
      const toolParams = selectedTool==='db_query'
        ? { sql:fullPrompt }
        : {
            prompt:fullPrompt,
            provider_name: selectedProvider==='default' ? config.default_provider : selectedProvider,
            model:         selectedModel==='default'    ? config.default_model    : selectedModel,
            max_tokens:1024,
          };
      const res  = await fetch(`${config.hub_url.replace(/\/$/,'')}/api`, {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${config.hf_token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ tool:selectedTool, params:toolParams }),
      });
      const data     = await res.json();
      const response = data.result || data.error || JSON.stringify(data);
      appendMessage({
        role:'hub',
        content:`⬡ Hub [${selectedTool}]: ${typeof response==='object'?JSON.stringify(response,null,2):response}`,
        ts:Date.now(),
      });
    } catch(e:unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      appendMessage({ role:'error', content:`Connection error: ${msg}`, ts:Date.now() });
    } finally { setLoading(false); }
  };

  const handleFile = async (file:File|undefined) => {
    if (!file) return;
    const r = await processBrowserFile(file);
    if (r.type==='error') sysMsg(`File: ${r.content}`);
    else setFileCache(r);
  };
  const handleDrop = (e:React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };
  const handleExport = (id:string, fmt:'json'|'txt'|'csv') => {
    const s = sessions.find(x=>x.id===id);
    if (s) exportSession(s,fmt);
  };

  const totalMessages = sessions.reduce((acc,s)=>acc+s.messages.length,0);

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{background:#0d0b14;overflow:hidden;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.3;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,.25);border-radius:2px}
        select option{background:#1a1625;color:#e2e8f0}
        button:focus-visible{outline:2px solid rgba(167,139,250,.5);outline-offset:2px}
      `}</style>

      <div style={{
        height:'100vh', display:'flex', flexDirection:'column',
        background:'#0d0b14', fontFamily:"'JetBrains Mono','Fira Code',monospace",
        color:'#e2e8f0', overflow:'hidden', position:'relative',
      }}>
        {/* BG */}
        <div style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:0 }}>
          <div style={{ position:'absolute',width:600,height:600,borderRadius:'50%',top:'-20%',left:'-10%',
            background:'radial-gradient(circle,rgba(94,74,252,.12) 0%,transparent 70%)',
            animation:'orbFloat 12s ease-in-out infinite' }}/>
          <div style={{ position:'absolute',width:400,height:400,borderRadius:'50%',bottom:'-10%',right:'15%',
            background:'radial-gradient(circle,rgba(167,139,250,.09) 0%,transparent 70%)',
            animation:'orbFloat 16s ease-in-out infinite reverse' }}/>
          <div style={{ position:'absolute',inset:0,
            backgroundImage:'radial-gradient(rgba(167,139,250,.04) 1px,transparent 1px)',
            backgroundSize:'32px 32px' }}/>
        </div>

        {/* HEADER */}
        <header style={{
          position:'relative',zIndex:10,
          background:'rgba(13,11,20,.88)',
          borderBottom:'1px solid rgba(167,139,250,.12)',
          backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',
          padding:'10px 20px',display:'flex',flexWrap:'wrap',
          alignItems:'center',gap:16,flexShrink:0,
          boxShadow:'0 1px 0 rgba(167,139,250,.06),0 4px 24px rgba(0,0,0,.4)',
        }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginRight:8 }}>
            <div style={{
              width:32,height:32,borderRadius:8,flexShrink:0,
              background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,fontWeight:700,color:'#fff',
              boxShadow:'0 0 16px rgba(94,74,252,.5)',
            }}>⬡</div>
            <div>
              <div style={{
                fontSize:13,fontWeight:700,letterSpacing:'.08em',
                fontFamily:"'Syne',sans-serif",
                background:'linear-gradient(90deg,#a78bfa,#7dd3fc,#a78bfa)',
                backgroundSize:'200% auto',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                animation:'shimmer 4s linear infinite',
              }}>UNIVERSAL AI HUB</div>
              <div style={{ fontSize:9,color:'#4b5563',letterSpacing:'.12em',textTransform:'uppercase' }}>by Volkan Kücükbudak</div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            {([
              { label:'GitHub',   href: config.github_url   || 'https://github.com/VolkanSah',                         color:'#a78bfa' },
              { label:'HF Space', href: config.hf_space_url || 'https://huggingface.co',                               color:'#7dd3fc' },
              { label:'MCP Hub',  href: 'https://github.com/VolkanSah/Universal-MCP-Hub-sandboxed',                    color:'#7fffb2' },
            ] as {label:string;href:string;color:string}[]).map(l=>(
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{
                padding:'5px 12px', borderRadius:6, fontSize:11, fontFamily:'monospace',
                color:'#4b5563', textDecoration:'none', letterSpacing:'.04em',
                border:'1px solid transparent', transition:'all .15s',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.color=l.color; e.currentTarget.style.borderColor=l.color+'44'; e.currentTarget.style.background=l.color+'11'; }}
                onMouseLeave={e=>{ e.currentTarget.style.color='#4b5563'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.background='transparent'; }}
              >↗ {l.label}</a>
            ))}
          </div>

          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:10 }}>
            <div style={{
              display:'flex',alignItems:'center',gap:6,
              background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',
              borderRadius:20,padding:'4px 12px',
              fontSize:10,fontFamily:'monospace',letterSpacing:'.08em',
              color:connected?'#7fffb2':'#ff8ca0',
            }}>
              <GlowDot on={connected}/>{statusText}
            </div>
            <button onClick={()=>setSidebarOpen(o=>!o)} style={{
              background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
              borderRadius:8,width:32,height:32,cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:sidebarOpen?'#a78bfa':'#4b5563',fontSize:16,
              transition:'all .15s',
            }} title="Toggle Sidebar">≡</button>
          </div>
        </header>

        {/* TABS */}
        <nav style={{
          position:'relative',zIndex:10,
          background:'rgba(13,11,20,.75)',
          borderBottom:'1px solid rgba(167,139,250,.08)',
          backdropFilter:'blur(12px)',display:'flex',
          padding:'0 20px',flexShrink:0,
        }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'12px 20px',fontSize:11,fontFamily:'monospace',
              letterSpacing:'.1em',textTransform:'uppercase',
              cursor:'pointer',background:'none',border:'none',outline:'none',
              borderBottom:tab===t?'2px solid #a78bfa':'2px solid transparent',
              color:tab===t?'#c4b5fd':'#4b5563',
              transition:'all .15s',display:'flex',alignItems:'center',gap:6,
            }}>
              <span style={{ fontSize:14 }}>{TAB_ICON[t]}</span>{t}
            </button>
          ))}
        </nav>

        {/* BODY */}
        <div style={{ flex:1,display:'flex',overflow:'hidden',position:'relative',zIndex:5 }}>

          {/* MAIN */}
          <main style={{ flex:1,display:'flex',flexDirection:'column',padding:20,overflow:'hidden',minWidth:0 }}>

            {/* ── CHAT ── */}
            {tab==='chat' && (
              <div style={{ display:'flex',flexDirection:'column',height:'100%' }}>
                <Panel style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column',marginBottom:12 }}>
                  <div style={{ flex:1,overflowY:'auto',padding:'20px 16px' }}>
                    {activeMessages.length===0 && (
                      <div style={{ textAlign:'center',padding:'60px 20px' }}>
                        <div style={{ fontSize:48,marginBottom:16,filter:'drop-shadow(0 0 24px rgba(94,74,252,.6))' }}>⬡</div>
                        <div style={{ fontSize:16,fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#c4b5fd',marginBottom:8 }}>
                          Universal AI Hub
                        </div>
                        <div style={{ fontSize:12,color:'#4b5563',lineHeight:2 }}>
                          Settings → Connect → Chat<br/>
                          Text · Code · CSV · JSON · MD · Images<br/>
                          PDF · ZIP → desktop client (hub.py)
                        </div>
                      </div>
                    )}
                    {activeMessages.map((m,i)=><Bubble key={i} msg={m}/>)}
                    {loading && <Typing/>}
                    <div ref={chatEndRef}/>
                  </div>
                </Panel>

                {fileCache && (
                  <div style={{
                    display:'flex',alignItems:'center',gap:8,marginBottom:8,
                    padding:'6px 12px',
                    background:'rgba(94,74,252,.1)',borderRadius:8,
                    border:'1px solid rgba(167,139,250,.2)',
                    fontSize:11,color:'#a78bfa',
                  }}>
                    <span>📎</span><span>{fileCache.name}</span>
                    <span style={{ color:'#6b7280' }}>({fileCache.type})</span>
                    <button onClick={()=>setFileCache(null)} style={{
                      marginLeft:'auto',background:'none',border:'none',
                      color:'#6b7280',cursor:'pointer',fontSize:14,lineHeight:'1',
                    }}>✕</button>
                  </div>
                )}

                <Panel style={{ padding:'8px 8px 8px 12px' }}>
                  <div
                    onDragOver={e=>{e.preventDefault();setDragging(true);}}
                    onDragLeave={()=>setDragging(false)}
                    onDrop={handleDrop}
                    style={{
                      display:'flex',gap:8,alignItems:'center',
                      outline:dragging?'2px dashed rgba(167,139,250,.5)':'none',
                      borderRadius:8,padding:4,
                    }}
                  >
                    <button onClick={()=>fileInputRef.current?.click()} title="Attach file" style={{
                      background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',
                      borderRadius:8,width:36,height:36,display:'flex',
                      alignItems:'center',justifyContent:'center',
                      cursor:'pointer',fontSize:16,flexShrink:0,color:'#6b7280',
                    }}>📎</button>
                    <input type="file" ref={fileInputRef} style={{ display:'none' }}
                      onChange={e=>handleFile(e.target.files?.[0])}/>

                    <input
                      value={input}
                      onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendChat()}
                      placeholder="Enter prompt… (or drag & drop a file)"
                      style={{
                        flex:1,background:'transparent',border:'none',outline:'none',
                        color:'#e2e8f0',fontSize:13,
                        fontFamily:"'JetBrains Mono',monospace",padding:'8px 4px',
                      }}
                    />

                    <button onClick={sendChat} disabled={loading||!input.trim()} style={{
                      background:loading||!input.trim()
                        ?'rgba(94,74,252,.2)'
                        :'linear-gradient(135deg,#5e4afc,#a78bfa)',
                      border:'none',borderRadius:8,padding:'8px 20px',
                      cursor:loading||!input.trim()?'not-allowed':'pointer',
                      color:'#fff',fontFamily:'monospace',fontSize:12,
                      fontWeight:700,letterSpacing:'.08em',flexShrink:0,
                      boxShadow:loading||!input.trim()?'none':'0 4px 16px rgba(94,74,252,.4)',
                      transition:'all .15s',
                    }}>
                      {loading?'…':'SEND ▶'}
                    </button>
                  </div>
                </Panel>
              </div>
            )}

            {/* ── TOOLS ── */}
            {tab==='tools' && (
              <div style={{ maxWidth:800,margin:'0 auto',width:'100%',overflowY:'auto',height:'100%' }}>
                <Panel style={{ padding:20 }}>
                  <div style={{ fontSize:11,color:'#6b7280',marginBottom:16,fontFamily:'monospace',letterSpacing:'.08em',textTransform:'uppercase' }}>
                    Active Tools
                  </div>
                  {tools.length===0?(
                    <div style={{ textAlign:'center',padding:'40px 0',color:'#4b5563',fontSize:12 }}>No tools — Connect first</div>
                  ):(
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:20 }}>
                      {tools.map(t=>(
                        <button key={t} onClick={()=>{setSelectedTool(t);setTab('chat');}} style={{
                          padding:'12px 14px',
                          background:'rgba(94,74,252,.07)',border:'1px solid rgba(167,139,250,.15)',
                          borderRadius:8,cursor:'pointer',
                          display:'flex',alignItems:'center',gap:8,
                          fontSize:12,color:'#c4b5fd',fontFamily:'monospace',
                          transition:'background .15s',textAlign:'left',
                        }}
                          onMouseEnter={e=>(e.currentTarget.style.background='rgba(94,74,252,.18)')}
                          onMouseLeave={e=>(e.currentTarget.style.background='rgba(94,74,252,.07)')}
                        >
                          <span style={{ color:'#5e4afc',fontWeight:700 }}>⬡</span>{t}
                        </button>
                      ))}
                    </div>
                  )}
                  {toolsJson&&(
                    <>
                      <div style={{ fontSize:11,color:'#6b7280',marginBottom:8,letterSpacing:'.08em',textTransform:'uppercase' }}>Raw Response</div>
                      <pre style={{
                        background:'rgba(0,0,0,.3)',borderRadius:8,padding:14,
                        fontSize:11,color:'#7fffb2',overflowX:'auto',maxHeight:300,overflowY:'auto',
                        border:'1px solid rgba(127,255,178,.1)',fontFamily:'monospace',
                      }}>{toolsJson}</pre>
                    </>
                  )}
                </Panel>
              </div>
            )}

            {/* ── CONNECT ── */}
            {tab==='connect' && (
              <div style={{ maxWidth:480,margin:'0 auto',width:'100%',paddingTop:20 }}>
                <Panel style={{ padding:28 }}>
                  <div style={{ textAlign:'center',marginBottom:28 }}>
                    <div style={{
                      width:64,height:64,borderRadius:16,margin:'0 auto 16px',
                      background:connected
                        ?'linear-gradient(135deg,rgba(127,255,178,.15),rgba(127,255,178,.05))'
                        :'linear-gradient(135deg,rgba(94,74,252,.2),rgba(167,139,250,.1))',
                      border:connected?'1px solid rgba(127,255,178,.3)':'1px solid rgba(167,139,250,.3)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,
                      boxShadow:connected?'0 0 24px rgba(127,255,178,.2)':'0 0 24px rgba(94,74,252,.2)',
                    }}>{connected?'●':'⬢'}</div>
                    <div style={{
                      fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,
                      marginBottom:4,color:connected?'#7fffb2':'#c4b5fd',
                    }}>{connected?'Connected':'Not Connected'}</div>
                    <div style={{ fontSize:11,color:'#4b5563',fontFamily:'monospace' }}>
                      {config.hub_url||'No Hub URL configured'}
                    </div>
                  </div>
                  <button onClick={fetchTools} style={{
                    width:'100%',padding:'14px',
                    background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
                    border:'none',borderRadius:10,cursor:'pointer',
                    color:'#fff',fontFamily:"'Syne',sans-serif",
                    fontSize:14,fontWeight:700,letterSpacing:'.06em',
                    boxShadow:'0 4px 24px rgba(94,74,252,.45)',
                    transition:'transform .1s',marginBottom:12,
                  }}
                    onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-1px)')}
                    onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}
                  >⬢ CONNECT / REFRESH TOOLS</button>
                  {connected&&(
                    <div style={{
                      padding:'12px 14px',background:'rgba(127,255,178,.05)',
                      border:'1px solid rgba(127,255,178,.15)',borderRadius:8,
                      fontSize:11,fontFamily:'monospace',color:'#7fffb2',lineHeight:1.8,
                    }}>
                      <div>Tools: {tools.length}</div>
                      <div>Providers: {providers.length-1}</div>
                      <div>Models: {models.length-1}</div>
                    </div>
                  )}
                </Panel>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {tab==='settings' && (
              <div style={{ maxWidth:520,margin:'0 auto',width:'100%',paddingTop:20,overflowY:'auto',height:'100%' }}>
                <Panel style={{ padding:28,marginBottom:16 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:'#c4b5fd',marginBottom:24 }}>
                    ◉ Hub Connection
                  </div>
                  <Field label="HF Token"         type="password" value={config.hf_token}        onChange={cfgSet('hf_token')}        placeholder="hf_…"/>
                  <Field label="Hub URL"                           value={config.hub_url}          onChange={cfgSet('hub_url')}          placeholder="https://your-space.hf.space"/>
                  <Field label="Default Provider"                  value={config.default_provider} onChange={cfgSet('default_provider')} placeholder="openai, anthropic…"/>
                  <Field label="Default Model"                     value={config.default_model}    onChange={cfgSet('default_model')}    placeholder="gpt-4o, claude-3-5-sonnet…"/>
                </Panel>

                <button onClick={saveSettings} style={{
                  width:'100%',padding:'13px',
                  background:'linear-gradient(135deg,#5e4afc,#a78bfa)',
                  border:'none',borderRadius:10,cursor:'pointer',
                  color:'#fff',fontFamily:"'Syne',sans-serif",
                  fontSize:13,fontWeight:700,letterSpacing:'.06em',
                  boxShadow:'0 4px 24px rgba(94,74,252,.4)',
                  transition:'transform .1s',marginBottom:16,
                }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-1px)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}
                >💾 SAVE SETTINGS</button>
                <Panel style={{ padding:'12px 16px' }}>
                  <div style={{ fontSize:10,fontFamily:'monospace',color:'#4b5563',lineHeight:2 }}>
                    <div style={{ color:'#6b7280',marginBottom:4 }}>Browser file support</div>
                    <div>✓ Text · Code · CSV · JSON · Markdown</div>
                    <div>✓ Images (JPEG · PNG · GIF · WebP)</div>
                    <div style={{ color:'#374151' }}>⚠ PDF · ZIP · XLSX → desktop client (hub.py)</div>
                  </div>
                </Panel>
              </div>
            )}
          </main>

          {/* SIDEBAR */}
          <Sidebar
            open={sidebarOpen}
            sessions={sessions}
            activeId={activeId}
            tools={tools}
            providers={providers}
            models={models}
            selectedTool={selectedTool}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onSelectSession={setActiveId}
            onNewChat={newChat}
            onDeleteSession={deleteSession}
            onSelectTool={(t)=>{ setSelectedTool(t); setTab('chat'); }}
            onSelectProvider={setSelectedProvider}
            onSelectModel={setSelectedModel}
            onExport={handleExport}
            config={config}
          />
        </div>

        {/* FOOTER */}
        <Footer config={config} sessionCount={sessions.length} msgCount={totalMessages}/>
      </div>
    </>
  );
}
// =============================================================================
// </ai-hub:main>
// © 2026 Volkan Kücükbudak — Apache 2.0 + ESOL 1.1
// https://github.com/VolkanSah/Universal-MCP-Hub-sandboxed
// =============================================================================
