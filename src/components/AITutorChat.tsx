import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Brain, GraduationCap, ArrowRight, RefreshCw, X } from "lucide-react";
import { getFreshSessionToken } from "../api";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface AITutorChatProps {
  courseTitle: string;
  moduleTitle: string;
  onClose?: () => void;
  className?: string;
}

export default function AITutorChat({ courseTitle, moduleTitle, onClose, className }: AITutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `Bonjour ! Je suis l'assistant académique de l'université **Axelmond Research Labs** pour le module **${courseTitle}** (*${moduleTitle}*). 

Je peux vous expliquer n'importe quelle portion du module, décortiquer un morceau de code, ou concevoir un exercice d'entraînement supplémentaire sur mesure. Que souhaitez-vous étudier ?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", text: messageText };
    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const token = await getFreshSessionToken();
      const response = await fetch("/api/chat-tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: messageText,
          courseContext: courseTitle,
          moduleContext: moduleTitle,
          chatHistory: messages
        }),
      });

      if (!response.ok) {
        throw new Error("L'assistant a rencontré une latence réseau.");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `Désolé, j'ai rencontré un problème pour me connecter aux services d'Axelmond Research Labs : ${err.message || "Erreur de connexion"}. Veuillez réessayer.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { label: "Expliquer la complexité $O(n \\log n)$", text: "Pouvez-vous m'expliquer précisément la complexité temporelle O(n log n) avec un exemple concret ?" },
    { label: "Donner un exemple de jointure SQL complexe", text: "Générez un exercice sur les requêtes SQL de jointures multiples (INNER JOIN, LEFT JOIN) avec sa correction détaillée." },
    { label: "Comprendre une section critique POSIX", text: "Qu'est-ce qu'une section critique en programmation système Linux ? Donnez-moi un exemple de situation de concurrence (race condition)." },
  ];

  // Helper to render basic markdown and code highlights safely
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        // Code Block
        const lines = part.slice(3, -3).trim().split("\n");
        let language = "code";
        if (lines[0] && ["c", "cpp", "python", "sql", "bash", "javascript", "typescript", "html"].includes(lines[0].toLowerCase())) {
          language = lines[0].toLowerCase();
          lines.shift();
        }
        const code = lines.join("\n");
        return (
          <div key={index} className="my-3 font-mono text-xs bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md">
            <div className="bg-slate-900 px-4 py-1.5 flex justify-between items-center text-slate-500 text-[10px] uppercase font-bold tracking-wider select-none border-b border-slate-900">
              <span>{language}</span>
              <span className="text-indigo-400">Axelmond Research Labs Compiler</span>
            </div>
            <pre className="p-4 overflow-x-auto whitespace-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      } else {
        // Parse basic markdown elements (Bold **text**, bullet * item, italic _text_)
        const textParts = part.split(/(\*\*.*?\*\*|\* .*?\n)/g);
        return (
          <span key={index} className="whitespace-pre-wrap leading-relaxed">
            {textParts.map((subPart, subIndex) => {
              if (subPart.startsWith("**") && subPart.endsWith("**")) {
                return <strong key={subIndex} className="font-extrabold text-slate-900">{subPart.slice(2, -2)}</strong>;
              } else if (subPart.startsWith("* ")) {
                return (
                  <span key={subIndex} className="block pl-4 my-1 relative">
                    <span className="absolute left-0 text-indigo-500">•</span>
                    {subPart.slice(2)}
                  </span>
                );
              }
              return subPart;
            })}
          </span>
        );
      }
    });
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden ${className || "h-[520px]"}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 px-5 py-4 text-white flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 border border-indigo-500/30">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              Tuteur Académique 
              <span className="text-[10px] bg-indigo-500 text-white font-mono uppercase px-1.5 py-0.5 rounded tracking-widest font-bold">IA</span>
            </h3>
            <p className="text-[10px] text-indigo-200 truncate max-w-[200px]">En ligne • Prêt à répondre</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-slate-400 mb-1 px-1 font-semibold flex items-center gap-1">
              {msg.role === "user" ? (
                "Vous (Étudiant)"
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Axelmond Research Labs Advisor
                </>
              )}
            </span>
            <div className={`p-4 rounded-2xl max-w-[88%] text-sm leading-relaxed shadow-sm ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-none"
                : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
            }`}>
              {renderMessageContent(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] text-slate-400 mb-1 px-1 font-semibold">Tuteur IA réfléchit...</span>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-none flex items-center gap-2 text-slate-500 text-xs shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              Calcul du modèle de raisonnement académique...
            </div>
          </div>
        )}
      </div>

      {/* Suggestion tags */}
      {messages.length === 1 && (
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex-shrink-0 space-y-1.5 overflow-x-auto">
          <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5 px-1">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> Suggestions de questions :
          </p>
          <div className="flex flex-col gap-1">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug.text)}
                className="w-full text-left bg-white text-xs text-indigo-700 font-medium px-3 py-2 border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between group"
              >
                <span>{sug.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Posez une question sur ce chapitre ou exercice..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
