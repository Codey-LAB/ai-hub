// Universal AI WEB HUB — Obsidian Glass Edition
// by Volkan Kücükbudak
// Apache 2 + ESOL 1.1

"use client";
import { useState, useEffect, useRef } from "react";

const SUPPORTED_TEXT = ["txt","py","js","ts","jsx","tsx","html","css","php","json","xml","md","sql","sh","c","cpp","java","rb","go","rs","kt","swift"];

async function processBrowserFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type: "image", content: e.target.result, name: file.name });
      r.readAsDataURL(file);
    });
  }
  if (SUPPORTED_TEXT.includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type: "text", content: e.target.result, name: file.name });
      r.readAsText(file);
    });
  }
  if (ext === "pdf") {
    return { type: "error", content: "PDF: server-side only (desktop client supports this)", name: file.name };
  }
  if (ext === "zip") {
    return { type: "error", content: "ZIP: server-side only (desktop client supports this)", name: file.name };
  }
  if (["csv","xlsx"].includes(ext)) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => res({ type: "text", content: e.target.result, name: file.name });
      r.readAsText(file);
    });
  }
  return { type: "error", content: `Unsupported: .${ext}`, name: file.name };
}

const TABS = ["chat","tools","connect","settings"];
const TAB_ICONS = { chat:"◈", tools:"⬡", connect:"⬢", settings:"◉" };

function GlowDot({ connected }) {
  return (
    <span style={{
      display:"inline-block", width:8, height:8, borderRadius:"50%",
      background: connected ? "#7fffb2" : "#ff4e6a",
      boxShadow: connected ? "0 0 8px 2px #7fffb299" : "0 0 8px 2px #ff4e6a88",
      marginRight:6, verticalAlign:"middle", flexShrink:0
    }} />
  );
}

function ObsidianPanel({ children, style={} }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      ...style
    }}>
      {children}
    </div>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  const isError = msg.role === "error";
  return (
    <div style={{
      display:"flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
      animation: "fadeSlideIn 0.22s ease"
    }}>
      {!isUser && (
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0, marginRight:8, marginTop:2,
          background: "linear-gradient(135deg, #5e4afc, #a78bfa)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:"#fff",
          boxShadow:"0 2px 8px rgba(94,74,252,0.4)"
        }}>⬡</div>
      )}
      <div style={{
        maxWidth:"72%",
        padding:"10px 14px",
        borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: isError
          ? "rgba(255,78,106,0.12)"
          : isUser
            ? "linear-gradient(135deg, rgba(94,74,252,0.35), rgba(167,139,250,0.2))"
            : "rgba(255,255,255,0.05)",
        border: isError
          ? "1px solid rgba(255,78,106,0.3)"
          : isUser
            ? "1px solid rgba(167,139,250,0.3)"
            : "1px solid rgba(255,255,255,0.07)",
        fontSize: 13,
        lineHeight: 1.6,
        color: isError ? "#ff8ca0" : "#e2e8f0",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        whiteSpace:"pre-wrap", wordBreak:"break-word",
        boxShadow: isUser ? "0 4px 16px rgba(94,74,252,0.15)" : "none"
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0, marginLeft:8, marginTop:2,
          background: "linear-gradient(135deg, #1e1e2e, #312e5a)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:12, fontWeight:700, color:"#a78bfa",
          border:"1px solid rgba(167,139,250,0.25)",
        }}>▶</div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", marginBottom:8 }}>
      <div style={{
        width:28, height:28, borderRadius:8, flexShrink:0,
        background:"linear-gradient(135deg,#5e4afc,#a78bfa)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:12, color:"#fff", fontWeight:700
      }}>⬡</div>
      <div style={{ display:"flex", gap:5, alignItems:"center" }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:7, height:7, borderRadius:"50%",
            background:"linear-gradient(135deg,#5e4afc,#a78bfa)",
            animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`,
            display:"inline-block"
          }} />
        ))}
        <span style={{ color:"#6b7280", fontSize:11, marginLeft:4, fontFamily:"monospace" }}>Hub processing…</span>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ color:"#6b7280", fontSize:11, fontFamily:"monospace", letterSpacing:".04em", textTransform:"uppercase" }}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        background:"rgba(255,255,255,0.04)",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:6, padding:"3px 8px",
        color:"#c4b5fd", fontSize:11, fontFamily:"monospace",
        outline:"none", cursor:"pointer",
        backdropFilter:"blur(8px)"
      }}>
        {options.map(o=><option key={o} value={o} style={{background:"#1a1625"}}>{o}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, type="text", value, onChange, placeholder="" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{
        display:"block", marginBottom:6,
        color:"#6b7280", fontSize:11, fontFamily:"monospace",
        letterSpacing:".06em", textTransform:"uppercase"
      }}>{label}</label>
      <input
        type={type} value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width:"100%", boxSizing:"border-box",
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:8, padding:"10px 14px",
          color:"#e2e8f0", fontSize:13, fontFamily:"monospace",
          outline:"none", transition:"border .15s",
        }}
        onFocus={e=>e.target.style.border="1px solid rgba(167,139,250,0.5)"}
        onBlur={e=>e.target.style.border="1px solid rgba(255,255,255,0.1)"}
      />
    </div>
  );
}

export default function VolkanNextHub() {
  const [tab, setTab] = useState("chat");
  const [connected, setConnected] = useState(false);
  const [statusText, setStatusText] = useState("not connected");
  const [config, setConfig] = useState({ hf_token:"", hub_url:"", default_provider:"", default_model:"", default_tool:"llm_complete" });
  const [tools, setTools] = useState([]);
  const [providers, setProviders] = useState(["default"]);
  const [models, setModels] = useState(["default"]);
  const [selectedTool, setSelectedTool] = useState("llm_complete");
  const [selectedProvider, setSelectedProvider] = useState("default");
  const [selectedModel, setSelectedModel] = useState("default");
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileCache, setFileCache] = useState(null);
  const [toolsJson, setToolsJson] = useState("");
  const [dragging, setDragging] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("mcp_config");
    if (saved) {
      const p = JSON.parse(saved);
      setConfig(p);
      setSelectedTool(p.default_tool || "llm_complete");
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [chat, loading]);

  const saveSettings = () => {
    localStorage.setItem("mcp_config", JSON.stringify(config));
    setConfig(c=>({...c}));
    addSystemMsg("Settings saved to browser storage.");
  };

  const addSystemMsg = (text) => {
    setChat(prev=>[...prev,{ role:"hub", content:`◉ System: ${text}` }]);
  };

  const fetchTools = async () => {
    if (!config.hub_url || !config.hf_token) {
      addSystemMsg("Configure Hub URL + HF Token in Settings first.");
      return;
    }
    setStatusText("connecting…");
    setConnected(false);
    try {
      const res = await fetch(`${config.hub_url.replace(/\/$/,"")}/api`, {
        method:"POST",
        headers:{ "Authorization":`Bearer ${config.hf_token}`, "Content-Type":"application/json" },
        body: JSON.stringify({ tool:"list_active_tools", params:{} })
      });
      const data = await res.json();
      const result = data.result || data;
      const t = result.active_tools || [];
      const p = ["default",...(result.active_llm_providers||[])];
      const m = ["default",...(result.available_models||[])];
      setTools(t); setProviders(p); setModels(m);
      setConnected(true);
      setStatusText("connected");
      setToolsJson(JSON.stringify(result, null, 2));
      addSystemMsg(`Connected — ${t.length} tools, ${p.length-1} providers, ${m.length-1} models loaded.`);
      setTab("chat");
    } catch(e) {
      setStatusText("connection failed");
      setConnected(false);
      addSystemMsg(`Connection failed: ${e.message}`);
    }
  };

  const sendChat = async () => {
    if (!input.trim() || loading) return;
    let fullPrompt = input;
    if (fileCache?.type === "text") fullPrompt = `${input}\n\n[File Content — ${fileCache.name}]\n${fileCache.content}`;

    const userContent = fileCache
      ? `▶ [${selectedTool}]: ${input}\n📎 ${fileCache.name}`
      : `▶ [${selectedTool}]: ${input}`;

    setChat(prev=>[...prev,{ role:"user", content:userContent }]);
    setInput(""); setLoading(true); setFileCache(null);

    try {
      const toolParams = selectedTool === "db_query"
        ? { sql: fullPrompt }
        : {
            prompt: fullPrompt,
            provider_name: selectedProvider === "default" ? config.default_provider : selectedProvider,
            model: selectedModel === "default" ? config.default_model : selectedModel,
            max_tokens: 1024
          };

      const res = await fetch(`${config.hub_url.replace(/\/$/,"")}/api`, {
        method:"POST",
        headers:{ "Authorization":`Bearer ${config.hf_token}`, "Content-Type":"application/json" },
        body: JSON.stringify({ tool:selectedTool, params:toolParams })
      });
      const data = await res.json();
      const response = data.result || data.error || JSON.stringify(data);
      setChat(prev=>[...prev,{ role:"hub", content:`⬡ Hub [${selectedTool}]: ${typeof response==="object"?JSON.stringify(response,null,2):response}` }]);
    } catch(e) {
      setChat(prev=>[...prev,{ role:"error", content:`Connection error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    const result = await processBrowserFile(file);
    if (result.type === "error") {
      addSystemMsg(`File: ${result.content}`);
    } else {
      setFileCache(result);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0d0b14; }
        @keyframes fadeSlideIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:.3; transform:scale(.9); }
          50%      { opacity:1;  transform:scale(1.15); }
        }
        @keyframes shimmer {
          0%   { background-position:200% center; }
          100% { background-position:-200% center; }
        }
        @keyframes rotateHex {
          0%   { transform:rotate(0deg); }
          100% { transform:rotate(360deg); }
        }
        @keyframes orbFloat {
          0%,100% { transform:translateY(0) scale(1); }
          50%      { transform:translateY(-30px) scale(1.05); }
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(167,139,250,.25); border-radius:2px; }
        select option { background:#1a1625; color:#e2e8f0; }
      `}</style>

      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        background:"#0d0b14",
        fontFamily:"'JetBrains Mono','Fira Code',monospace",
        color:"#e2e8f0",
        position:"relative", overflow:"hidden"
      }}>

        {/* Background orbs */}
        <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
          <div style={{
            position:"absolute", width:600, height:600,
            borderRadius:"50%", top:"-20%", left:"-10%",
            background:"radial-gradient(circle, rgba(94,74,252,0.12) 0%, transparent 70%)",
            animation:"orbFloat 12s ease-in-out infinite"
          }}/>
          <div style={{
            position:"absolute", width:400, height:400,
            borderRadius:"50%", bottom:"-10%", right:"-5%",
            background:"radial-gradient(circle, rgba(167,139,250,0.09) 0%, transparent 70%)",
            animation:"orbFloat 16s ease-in-out infinite reverse"
          }}/>
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"radial-gradient(rgba(167,139,250,0.04) 1px, transparent 1px)",
            backgroundSize:"32px 32px"
          }}/>
        </div>

        {/* HEADER */}
        <header style={{
          position:"relative", zIndex:10,
          background:"rgba(13,11,20,0.8)",
          borderBottom:"1px solid rgba(167,139,250,0.12)",
          backdropFilter:"blur(24px)",
          padding:"10px 20px",
          display:"flex", flexWrap:"wrap", alignItems:"center", gap:16,
          boxShadow:"0 1px 0 rgba(167,139,250,0.06), 0 4px 24px rgba(0,0,0,0.4)"
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:8 }}>
            <div style={{
              width:32, height:32,
              background:"linear-gradient(135deg, #5e4afc, #a78bfa)",
              borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, fontWeight:700, color:"#fff",
              boxShadow:"0 0 16px rgba(94,74,252,0.5)",
              flexShrink:0
            }}>⬡</div>
            <div>
              <div style={{
                fontSize:13, fontWeight:700, letterSpacing:".08em",
                fontFamily:"'Syne',sans-serif",
                background:"linear-gradient(90deg, #a78bfa, #7dd3fc, #a78bfa)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                animation:"shimmer 4s linear infinite"
              }}>UNIVERSAL AI HUB</div>
              <div style={{ fontSize:9, color:"#4b5563", letterSpacing:".12em", textTransform:"uppercase" }}>by Volkan Kücükbudak</div>
            </div>
          </div>

          {/* Selects */}
          <SelectField label="Tool" value={selectedTool} onChange={setSelectedTool}
            options={tools.length>0 ? tools : ["llm_complete"]} />
          <SelectField label="Provider" value={selectedProvider} onChange={setSelectedProvider} options={providers} />
          <SelectField label="Model" value={selectedModel} onChange={setSelectedModel} options={models} />

          {/* Status */}
          <div style={{
            marginLeft:"auto", display:"flex", alignItems:"center", gap:6,
            background:"rgba(255,255,255,0.03)",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:20, padding:"4px 12px",
            fontSize:10, fontFamily:"monospace", letterSpacing:".08em",
            color: connected ? "#7fffb2" : "#ff8ca0"
          }}>
            <GlowDot connected={connected} />
            {statusText}
          </div>
        </header>

        {/* TABS */}
        <nav style={{
          position:"relative", zIndex:10,
          background:"rgba(13,11,20,0.7)",
          borderBottom:"1px solid rgba(167,139,250,0.08)",
          backdropFilter:"blur(12px)",
          display:"flex", padding:"0 20px"
        }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:"12px 20px",
              fontSize:11, fontFamily:"monospace", letterSpacing:".1em",
              textTransform:"uppercase", cursor:"pointer",
              background:"none", border:"none", outline:"none",
              borderBottom: tab===t ? "2px solid #a78bfa" : "2px solid transparent",
              color: tab===t ? "#c4b5fd" : "#4b5563",
              transition:"all .15s", display:"flex", alignItems:"center", gap:6
            }}>
              <span style={{ fontSize:14 }}>{TAB_ICONS[t]}</span>
              {t}
            </button>
          ))}
        </nav>

        {/* MAIN */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", padding:20, position:"relative", zIndex:5, overflow:"hidden" }}>

          {/* ── CHAT TAB ── */}
          {tab==="chat" && (
            <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 160px)" }}>
              <ObsidianPanel style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", marginBottom:12 }}>
                <div style={{
                  flex:1, overflowY:"auto", padding:"20px 16px",
                }}>
                  {chat.length===0 && (
                    <div style={{ textAlign:"center", padding:"60px 20px" }}>
                      <div style={{
                        fontSize:48, marginBottom:16,
                        filter:"drop-shadow(0 0 24px rgba(94,74,252,0.6))"
                      }}>⬡</div>
                      <div style={{
                        fontSize:16, fontFamily:"'Syne',sans-serif", fontWeight:700,
                        color:"#c4b5fd", marginBottom:8
                      }}>Universal AI Hub</div>
                      <div style={{ fontSize:12, color:"#4b5563", lineHeight:1.8 }}>
                        Configure in Settings → Connect → Start chatting<br/>
                        Supports: text files, images, CSV, JSON, MD, code
                      </div>
                    </div>
                  )}
                  {chat.map((m,i)=><ChatBubble key={i} msg={m} />)}
                  {loading && <TypingIndicator />}
                  <div ref={chatEndRef} />
                </div>
              </ObsidianPanel>

              {/* File badge */}
              {fileCache && (
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                  marginBottom:8, padding:"6px 12px",
                  background:"rgba(94,74,252,0.1)", borderRadius:8,
                  border:"1px solid rgba(167,139,250,0.2)",
                  fontSize:11, color:"#a78bfa"
                }}>
                  <span>📎</span>
                  <span>{fileCache.name}</span>
                  <span style={{ color:"#6b7280" }}>({fileCache.type})</span>
                  <button onClick={()=>setFileCache(null)} style={{
                    marginLeft:"auto", background:"none", border:"none",
                    color:"#6b7280", cursor:"pointer", fontSize:14, lineHeight:1
                  }}>✕</button>
                </div>
              )}

              {/* Input bar */}
              <ObsidianPanel
                style={{ padding:"8px 8px 8px 12px" }}
                onDragOver={e=>{e.preventDefault();setDragging(true);}}
                onDragLeave={()=>setDragging(false)}
                onDrop={handleDrop}
              >
                <div style={{
                  display:"flex", gap:8, alignItems:"center",
                  outline: dragging ? "2px dashed rgba(167,139,250,0.5)" : "none",
                  borderRadius:8, padding:4
                }}>
                  <button onClick={()=>fileInputRef.current?.click()} title="Attach file" style={{
                    background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:8, width:36, height:36,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", fontSize:16, flexShrink:0,
                    transition:"background .15s", color:"#6b7280"
                  }}
                    onMouseEnter={e=>e.target.style.background="rgba(167,139,250,0.1)"}
                    onMouseLeave={e=>e.target.style.background="rgba(255,255,255,0.04)"}
                  >📎</button>
                  <input type="file" ref={fileInputRef} style={{ display:"none" }}
                    onChange={e=>handleFile(e.target.files?.[0])} />

                  <input
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
                    placeholder="Enter prompt… (drag & drop files here)"
                    style={{
                      flex:1, background:"transparent", border:"none",
                      outline:"none", color:"#e2e8f0", fontSize:13,
                      fontFamily:"'JetBrains Mono',monospace", padding:"8px 4px"
                    }}
                  />

                  <button onClick={sendChat} disabled={loading || !input.trim()} style={{
                    background: loading||!input.trim()
                      ? "rgba(94,74,252,0.2)"
                      : "linear-gradient(135deg, #5e4afc, #a78bfa)",
                    border:"none", borderRadius:8,
                    padding:"8px 20px", cursor: loading||!input.trim() ? "not-allowed" : "pointer",
                    color:"#fff", fontFamily:"monospace", fontSize:12,
                    fontWeight:700, letterSpacing:".08em",
                    boxShadow: loading||!input.trim() ? "none" : "0 4px 16px rgba(94,74,252,0.4)",
                    transition:"all .15s", flexShrink:0
                  }}>
                    {loading ? "…" : "SEND ▶"}
                  </button>
                </div>
              </ObsidianPanel>
            </div>
          )}

          {/* ── TOOLS TAB ── */}
          {tab==="tools" && (
            <div style={{ maxWidth:800, margin:"0 auto", width:"100%" }}>
              <ObsidianPanel style={{ padding:20 }}>
                <div style={{
                  fontSize:11, color:"#6b7280", marginBottom:16,
                  fontFamily:"monospace", letterSpacing:".08em", textTransform:"uppercase"
                }}>Active Tools from Hub</div>

                {tools.length===0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0", color:"#4b5563", fontSize:12 }}>
                    No tools loaded — go to Connect tab first
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:10, marginBottom:20 }}>
                    {tools.map(t=>(
                      <div key={t} onClick={()=>{setSelectedTool(t);setTab("chat");}} style={{
                        padding:"12px 14px",
                        background:"rgba(94,74,252,0.07)",
                        border:"1px solid rgba(167,139,250,0.15)",
                        borderRadius:8, cursor:"pointer",
                        display:"flex", alignItems:"center", gap:8,
                        fontSize:12, color:"#c4b5fd", fontFamily:"monospace",
                        transition:"all .15s"
                      }}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(94,74,252,0.18)"}
                        onMouseLeave={e=>e.currentTarget.style.background="rgba(94,74,252,0.07)"}
                      >
                        <span style={{color:"#5e4afc",fontWeight:700}}>⬡</span> {t}
                      </div>
                    ))}
                  </div>
                )}

                {toolsJson && (
                  <>
                    <div style={{ fontSize:11, color:"#6b7280", marginBottom:8, letterSpacing:".08em", textTransform:"uppercase" }}>Raw Response</div>
                    <pre style={{
                      background:"rgba(0,0,0,0.3)", borderRadius:8, padding:14,
                      fontSize:11, color:"#7fffb2", overflowX:"auto", maxHeight:300, overflowY:"auto",
                      border:"1px solid rgba(127,255,178,0.1)"
                    }}>{toolsJson}</pre>
                  </>
                )}
              </ObsidianPanel>
            </div>
          )}

          {/* ── CONNECT TAB ── */}
          {tab==="connect" && (
            <div style={{ maxWidth:480, margin:"0 auto", width:"100%", paddingTop:20 }}>
              <ObsidianPanel style={{ padding:28 }}>
                <div style={{ textAlign:"center", marginBottom:28 }}>
                  <div style={{
                    width:64, height:64, borderRadius:16, margin:"0 auto 16px",
                    background: connected
                      ? "linear-gradient(135deg, rgba(127,255,178,0.15), rgba(127,255,178,0.05))"
                      : "linear-gradient(135deg, rgba(94,74,252,0.2), rgba(167,139,250,0.1))",
                    border: connected ? "1px solid rgba(127,255,178,0.3)" : "1px solid rgba(167,139,250,0.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:28,
                    boxShadow: connected ? "0 0 24px rgba(127,255,178,0.2)" : "0 0 24px rgba(94,74,252,0.2)"
                  }}>{connected ? "●" : "⬢"}</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, marginBottom:4, color: connected?"#7fffb2":"#c4b5fd" }}>
                    {connected ? "Connected" : "Not Connected"}
                  </div>
                  <div style={{ fontSize:11, color:"#4b5563", fontFamily:"monospace" }}>
                    {config.hub_url || "No Hub URL configured"}
                  </div>
                </div>

                <button onClick={fetchTools} style={{
                  width:"100%", padding:"14px",
                  background:"linear-gradient(135deg, #5e4afc, #a78bfa)",
                  border:"none", borderRadius:10, cursor:"pointer",
                  color:"#fff", fontFamily:"'Syne',sans-serif", fontSize:14,
                  fontWeight:700, letterSpacing:".06em",
                  boxShadow:"0 4px 24px rgba(94,74,252,0.45)",
                  transition:"transform .1s, box-shadow .1s", marginBottom:12
                }}
                  onMouseEnter={e=>{ e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 28px rgba(94,74,252,0.6)"; }}
                  onMouseLeave={e=>{ e.target.style.transform="translateY(0)"; e.target.style.boxShadow="0 4px 24px rgba(94,74,252,0.45)"; }}
                >
                  ⬢ CONNECT / REFRESH TOOLS
                </button>

                {connected && (
                  <div style={{
                    padding:"12px 14px", background:"rgba(127,255,178,0.05)",
                    border:"1px solid rgba(127,255,178,0.15)", borderRadius:8, fontSize:11,
                    fontFamily:"monospace", color:"#7fffb2", lineHeight:1.8
                  }}>
                    <div>Tools: {tools.length}</div>
                    <div>Providers: {providers.length-1}</div>
                    <div>Models: {models.length-1}</div>
                  </div>
                )}
              </ObsidianPanel>
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab==="settings" && (
            <div style={{ maxWidth:480, margin:"0 auto", width:"100%", paddingTop:20 }}>
              <ObsidianPanel style={{ padding:28 }}>
                <div style={{
                  fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700,
                  color:"#c4b5fd", marginBottom:24, letterSpacing:".04em"
                }}>◉ Configuration</div>

                <InputField label="HF Token" type="password" value={config.hf_token}
                  onChange={v=>setConfig(c=>({...c,hf_token:v}))} placeholder="hf_…" />
                <InputField label="Hub URL" value={config.hub_url}
                  onChange={v=>setConfig(c=>({...c,hub_url:v}))} placeholder="https://your-space.hf.space" />
                <InputField label="Default Provider" value={config.default_provider}
                  onChange={v=>setConfig(c=>({...c,default_provider:v}))} placeholder="openai, anthropic, …" />
                <InputField label="Default Model" value={config.default_model}
                  onChange={v=>setConfig(c=>({...c,default_model:v}))} placeholder="gpt-4o, claude-3-5…" />

                <button onClick={saveSettings} style={{
                  width:"100%", padding:"13px",
                  background:"linear-gradient(135deg, #5e4afc, #a78bfa)",
                  border:"none", borderRadius:10, cursor:"pointer",
                  color:"#fff", fontFamily:"'Syne',sans-serif", fontSize:13,
                  fontWeight:700, letterSpacing:".06em",
                  boxShadow:"0 4px 24px rgba(94,74,252,0.4)",
                  transition:"transform .1s"
                }}
                  onMouseEnter={e=>e.target.style.transform="translateY(-1px)"}
                  onMouseLeave={e=>e.target.style.transform="translateY(0)"}
                >
                  💾 SAVE SETTINGS
                </button>

                <div style={{
                  marginTop:20, padding:"12px 14px",
                  background:"rgba(255,255,255,0.02)",
                  border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:8, fontSize:10, fontFamily:"monospace",
                  color:"#4b5563", lineHeight:2
                }}>
                  <div style={{color:"#6b7280", marginBottom:4}}>Browser file support:</div>
                  <div>✓ Text / Code / Markdown / JSON / CSV</div>
                  <div>✓ Images (JPEG, PNG, GIF, WebP)</div>
                  <div style={{color:"#374151"}}>⚠ PDF / ZIP → desktop client only</div>
                </div>
              </ObsidianPanel>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
