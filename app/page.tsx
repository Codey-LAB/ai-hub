"use client";
import { useState } from 'react';

export default function PromptStudio() {
  const [result, setResult] = useState("");

  // Deine Listen (Hier kannst du später hunderte Einträge einfügen)
  const data = {
    subjects: ["Ein mechanischer Krieger", "Eine Cyberpunk-Stadt", "Ein dunkler Magier"],
    styles: ["im Stil von Giger", "Neon-Art", "Hyperrealistisch"],
    lighting: ["Film-Noir Beleuchtung", "Gegenlicht", "weiches Studio-Licht"]
  };

  const generate = () => {
    const s = data.subjects[Math.floor(Math.random() * data.subjects.length)];
    const st = data.styles[Math.floor(Math.random() * data.styles.length)];
    const l = data.lighting[Math.floor(Math.random() * data.lighting.length)];
    setResult(`${s}, ${st}, ${l}, 8k resolution, highly detailed`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    alert("Prompt kopiert!");
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-8 font-mono">
      <div className="max-w-xl mx-auto border border-[#30363d] bg-[#161b22] p-6 rounded-md">
        <h1 className="text-[#58a6ff] text-lg mb-4 border-b border-[#21262d] pb-2">⬡ VOLKAN PROMPT ENGINE</h1>
        
        <div className="bg-[#0d1117] p-4 rounded border border-[#21262d] mb-4 min-h-[60px] text-sm italic">
          {result || "Klicke auf Generate..."}
        </div>

        <div className="flex gap-2">
          <button onClick={generate} className="flex-1 bg-[#238636] py-2 rounded font-bold hover:bg-[#2ea043]">
            WÜRFELN 🎲
          </button>
          
          {result && (
            <button onClick={copyToClipboard} className="bg-[#30363d] px-4 py-2 rounded hover:bg-[#3fb950]">
              📋
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
