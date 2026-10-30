import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, MessageSquare, Plus, Send, Sparkles, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api.js';
import { classNames, getErrorMessage } from '../lib/utils.js';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/Spinner.jsx';

const SUGGESTIONS = [
  '¿Cómo van mis gastos este mes?',
  '¿En qué categoría debería recortar?',
  'Dame un plan de ahorro para el próximo mes',
  '¿Estoy cumpliendo mis presupuestos?',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  const loadSessions = useCallback(async (autoSelect = false) => {
    const response = await api.get('/ai/chat/sessions');
    const data = response.data.data;
    setSessions(data);
    return data;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await loadSessions();
        if (active && data.length > 0) {
          setCurrentId(data[0].id);
        }
      } catch (error) {
        toast.error(getErrorMessage(error, 'No se pudieron cargar las conversaciones'));
      } finally {
        if (active) setLoadingSessions(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoadingMessages(true);

    (async () => {
      try {
        const response = await api.get(`/ai/chat/sessions/${currentId}`);
        if (active) setMessages(response.data.data.messages || []);
      } catch (error) {
        toast.error(getErrorMessage(error, 'No se pudo cargar la conversación'));
      } finally {
        if (active) setLoadingMessages(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const startNewChat = () => {
    setCurrentId(null);
    setMessages([]);
    setInput('');
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('¿Eliminar esta conversación?')) return;

    try {
      await api.delete(`/ai/chat/sessions/${sessionId}`);
      const data = await loadSessions();
      if (currentId === sessionId) {
        if (data.length > 0) setCurrentId(data[0].id);
        else startNewChat();
      }
      toast.success('Conversación eliminada');
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar la conversación'));
    }
  };

  const send = async (rawMessage) => {
    const message = (rawMessage ?? input).trim();
    if (!message || sending) return;

    setSending(true);
    setInput('');

    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await api.post('/ai/chat/messages', {
        message,
        sessionId: currentId || undefined,
      });

      const { session, userMessage, assistantMessage } = response.data.data;
      setCurrentId(session.id);
      setMessages((prev) => [
        ...prev.filter((item) => item.id !== optimistic.id),
        userMessage,
        assistantMessage,
      ]);
      await loadSessions();
    } catch (error) {
      setMessages((prev) => prev.filter((item) => item.id !== optimistic.id));
      setInput(message);
      toast.error(getErrorMessage(error, 'No se pudo enviar el mensaje'));
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  if (loadingSessions) {
    return <PageLoader label="Cargando conversaciones..." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Chat con IA</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pregunta sobre tus finanzas reales. La IA usa tus cuentas, gastos y presupuestos.
        </p>
      </div>

      <div className="card grid min-h-[560px] overflow-hidden lg:h-[calc(100vh-11rem)] lg:grid-cols-[290px_1fr]">
        <aside className="hidden min-h-0 flex-col border-r border-slate-200 lg:flex">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Conversaciones</p>
            <Button size="sm" variant="secondary" icon={Plus} onClick={startNewChat}>
              Nueva
            </Button>
          </div>

          <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">
                Aún no tienes conversaciones guardadas.
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={classNames(
                    'group flex items-center gap-2 rounded-xl px-3 py-2.5 transition',
                    currentId === session.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentId(session.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium text-slate-800">{session.title}</p>
                    <p className="truncate text-xs text-slate-400">
                      {session._count?.messages || 0} mensajes
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    className="rounded-md p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label="Eliminar conversación"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">SmartFinance AI</p>
                <p className="text-[11px] text-slate-400">Asesor financiero con tus datos</p>
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <select
                className="input h-9 max-w-[150px] py-0 text-xs"
                value={currentId || ''}
                onChange={(event) => setCurrentId(event.target.value || null)}
              >
                <option value="">Nueva conversación</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary" icon={Plus} onClick={startNewChat} />
            </div>
          </div>

          <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-4 py-5">
            {loadingMessages ? (
              <PageLoader label="Cargando mensajes..." />
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-xl">
                <EmptyState
                  icon={MessageSquare}
                  title="Conversa con tu asesor financiero"
                  description="Puedo analizar tus gastos, presupuestos y ayudarte a planificar el próximo mes."
                />
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setInput(suggestion)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isUser = message.role === 'USER';
                  return (
                    <div
                      key={message.id}
                      className={classNames('flex items-start gap-2.5', isUser && 'flex-row-reverse')}
                    >
                      <div
                        className={classNames(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white',
                          isUser ? 'bg-slate-700' : 'bg-brand-600',
                        )}
                      >
                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={classNames(
                          'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%]',
                          isUser
                            ? 'rounded-tr-sm bg-slate-900 text-white'
                            : 'rounded-tl-sm bg-white text-slate-700 ring-1 ring-slate-200',
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <TypingIndicator />
                  </div>
                )}
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                className="input max-h-32 min-h-[44px] flex-1 resize-none py-3"
                placeholder="Escribe tu pregunta... (Enter para enviar)"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={2000}
              />
              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 shrink-0"
                loading={sending}
                disabled={!input.trim()}
                aria-label="Enviar mensaje"
              >
                {!sending && <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-400">
              La IA puede cometer errores. Verifica cifras importantes antes de tomar decisiones.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
