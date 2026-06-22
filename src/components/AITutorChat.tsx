import React, { useState, useRef, useEffect, useId } from "react";
import { getClientErrorMessage } from "../client-errors";
import { CHAT_TUTOR_MAX_HISTORY_MESSAGES } from "../chat-tutor-limits";
import { Send, Sparkles, Brain, GraduationCap, ArrowRight, X } from "lucide-react";
import { api } from "../api";

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface AITutorChatProps {
  courseId: number;
  moduleId?: number;
  courseTitle: string;
  moduleTitle: string;
  onClose?: () => void;
  className?: string;
  variant?: "default" | "live";
}

export default function AITutorChat({
  courseId,
  moduleId,
  courseTitle,
  moduleTitle,
  onClose,
  className,
  variant = "default",
}: AITutorChatProps) {
  const isLive = variant === "live";
  const inputId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `Bonjour ! Je suis l'assistant académique de **Performance Académique** pour le module **${courseTitle}** (*${moduleTitle}*). 

Je peux vous expliquer n'importe quelle portion du module, décortiquer un morceau de code, ou concevoir un exercice d'entraînement supplémentaire sur mesure. Que souhaitez-vous étudier ?`,
    },
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
      const requestBody: {
        courseId: number;
        moduleId?: number;
        prompt: string;
        chatHistory: ChatMessage[];
      } = {
        courseId,
        prompt: messageText,
        chatHistory: messages.slice(-CHAT_TUTOR_MAX_HISTORY_MESSAGES),
      };
      if (moduleId !== undefined) {
        requestBody.moduleId = moduleId;
      }

      const data = await api.chatTutor(requestBody);
      setMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (err: any) {
      let message = getClientErrorMessage(err, "Erreur de connexion");
      if (err?.code === "QUOTA_EXCEEDED") {
        message = "Assistant temporairement indisponible.";
      } else if (err?.code === "AUTH_ERROR") {
        message = "Assistant temporairement indisponible.";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `Désolé, j'ai rencontré un problème pour me connecter aux services de Performance Académique : ${message}. Veuillez réessayer.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    {
      label: "Expliquer la complexité $O(n \\log n)$",
      text: "Pouvez-vous m'expliquer précisément la complexité temporelle O(n log n) avec un exemple concret ?",
    },
    {
      label: "Donner un exemple de jointure SQL complexe",
      text: "Générez un exercice sur les requêtes SQL de jointures multiples (INNER JOIN, LEFT JOIN) avec sa correction détaillée.",
    },
    {
      label: "Comprendre une section critique POSIX",
      text: "Qu'est-ce qu'une section critique en programmation système Linux ? Donnez-moi un exemple de situation de concurrence (race condition).",
    },
  ];

  // Helper to render basic markdown and code highlights safely
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith("```")) {
        // Code Block
        const lines = part.slice(3, -3).trim().split("\n");
        let language = "code";
        if (
          lines[0] &&
          ["c", "cpp", "python", "sql", "bash", "javascript", "typescript", "html"].includes(lines[0].toLowerCase())
        ) {
          language = lines[0].toLowerCase();
          lines.shift();
        }
        const code = lines.join("\n");
        return (
          <div
            key={index}
            className="my-3 font-mono text-xs bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-md"
          >
            <div className="bg-slate-900 px-4 py-1.5 flex justify-between items-center text-slate-500 text-[10px] uppercase font-bold tracking-wider select-none border-b border-slate-900">
              <span>{language}</span>
              <span className="text-indigo-400">Compiler Académique</span>
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
                return (
                  <strong key={subIndex} className="font-extrabold text-slate-900 dark:text-slate-100">
                    {subPart.slice(2, -2)}
                  </strong>
                );
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
    <section
      aria-label={`Tuteur académique IA pour ${courseTitle}`}
      className={`flex flex-col overflow-hidden ${
        isLive
          ? "min-h-0 flex-1 w-full self-stretch rounded-2xl border border-white/10 bg-zinc-950 shadow-xl"
          : "bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 min-h-[320px] h-[min(520px,60dvh)]"
      } ${className || ""}`}
    >
      {/* Header */}
      <div
        className={`px-5 py-4 text-white flex items-center justify-between shadow-sm flex-shrink-0 ${
          isLive ? "bg-zinc-900 border-b border-white/10" : "bg-gradient-to-r from-slate-900 to-indigo-900"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 border border-indigo-500/30 shrink-0"
            aria-hidden="true"
          >
            <Brain className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-white flex items-center gap-1.5">
              Tuteur Académique
              <span className="text-[10px] bg-indigo-500 text-white font-mono uppercase px-1.5 py-0.5 rounded tracking-widest font-bold">
                IA
              </span>
            </h3>
            <p className="text-xs text-indigo-200 truncate">En ligne • Prêt à répondre</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="kbd-nav-focus touch-target p-2 rounded-full text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer le tuteur académique IA"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Historique de conversation avec le tuteur IA"
        className={`flex-1 min-h-[160px] overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth ${
          isLive ? "bg-zinc-950 custom-scrollbar" : "bg-slate-50 dark:bg-slate-950"
        }`}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-slate-400 mb-1 px-1 font-semibold flex items-center gap-1">
              {msg.role === "user" ? (
                "Vous (Étudiant)"
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-500" aria-hidden="true" />
                   Conseiller Performance Académique
                </>
              )}
            </span>
            <div
              className={`p-4 rounded-2xl max-w-[92%] text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : isLive
                    ? "bg-zinc-900 text-zinc-100 border border-white/10 rounded-tl-none"
                    : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none"
              }`}
            >
              {renderMessageContent(msg.text)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex flex-col items-start" role="status" aria-live="polite">
            <span className="text-[10px] text-slate-400 mb-1 px-1 font-semibold">Tuteur IA réfléchit...</span>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none flex items-center gap-2 text-slate-500 text-xs shadow-sm">
              <span className="flex h-2 w-2 relative" aria-hidden="true">
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
        <div
          className={`px-4 py-3 border-t flex-shrink-0 space-y-2 ${
            isLive
              ? "bg-zinc-900/80 border-white/10"
              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
          }`}
        >
          <p
            className={`font-bold uppercase flex items-center gap-1.5 px-1 ${isLive ? "text-[11px] text-zinc-400" : "text-[11px] text-slate-500"}`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-400" aria-hidden="true" /> Suggestions de questions
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(sug.text)}
                aria-label={`Suggestion : ${sug.label}`}
                className={`kbd-nav-focus w-full text-left font-medium px-3 py-3 rounded-xl transition-all flex items-center justify-between group ${
                  isLive
                    ? "bg-zinc-950 text-sm text-indigo-100 border border-white/10 hover:border-indigo-400/40 hover:bg-indigo-500/10"
                    : "bg-white dark:bg-slate-900 text-xs text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40"
                }`}
              >
                <span className="pr-2">{sug.label}</span>
                <ArrowRight
                  className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className={`p-4 flex-shrink-0 border-t ${
          isLive ? "bg-zinc-900 border-white/10" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <label htmlFor={inputId} className="sr-only">
            Poser une question au tuteur académique IA
          </label>
          <input
            id={inputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Posez une question sur ce chapitre ou exercice..."
            className={`kbd-nav-focus flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
              isLive
                ? "bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 focus:border-indigo-500"
                : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600"
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Envoyer la question au tuteur IA"
            className="kbd-nav-focus touch-target min-h-[48px] min-w-[48px] p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
