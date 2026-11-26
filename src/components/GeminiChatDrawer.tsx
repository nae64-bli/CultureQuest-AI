import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatMessage } from '../types/culture.ts';

interface GeminiChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

const STARTER_PROMPTS = [
  '¿Qué museos tienen entrada gratuita en Asunción?',
  '¿Cuál es el horario y precio del Museo del Barro?',
  'Recomendame un recorrido histórico por el centro de Asunción.',
  'Contame la historia de las Misiones Jesuíticas de Trinidad.',
];

export function GeminiChatDrawer({ open, onClose }: GeminiChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !body.reply) {
        throw new Error(
          body.error || 'No se pudo recibir respuesta del asistente Gemini.'
        );
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: body.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, assistantMessage]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al consultar el asistente Gemini.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1C1917]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Asistente cultural Gemini"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md h-full bg-[#FBF9F5] border-l border-stone-300 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3 bg-[#F7F4EE]">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-[#9A3412]" />
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#1C1917] leading-none">
                Asistente Cultural Gemini
              </h2>
              <p className="text-xs text-[#78716C] mt-1">
                Conectado al catálogo real de CultureQuest AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                aria-label="Limpiar conversación"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[#78716C] hover:text-[#1C1917] hover:bg-stone-200/60 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar asistente"
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-[#57534E] hover:text-[#1C1917] hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-[#44403C] leading-relaxed">
                Preguntá cualquier duda abierta sobre museos, galerías, historia o
                itinerarios culturales de Paraguay. El asistente consulta en vivo los
                horarios, precios y direcciones del catálogo actual.
              </p>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest text-[#78716C]">
                  Consultas sugeridas
                </p>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-[#1C1917] bg-[#F7F4EE] hover:bg-[#F3EFE7] border border-stone-200 rounded-md transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#1C1917] text-[#FBF9F5]'
                    : 'bg-[#F7F4EE] border border-stone-200 text-[#1C1917]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#78716C] py-1">
              <Loader2 className="w-4 h-4 animate-spin text-[#9A3412]" />
              <span>Consultando catálogo y redactando respuesta...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-stone-200 bg-[#F7F4EE] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Preguntá sobre museos, horarios o historia..."
            maxLength={2000}
            className="flex-1 px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Enviar mensaje"
            className="inline-flex items-center justify-center w-10 h-10 bg-[#9A3412] hover:bg-[#7C2D12] text-[#FBF9F5] rounded-md transition-colors cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
}
