import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, Bot, ExternalLink, LoaderCircle, MessageCircle, Sparkles } from 'lucide-react';
import { chatService } from '../../services/api';
import type { ChatSource, ChatTurn } from '../../services/api';

type Message = ChatTurn & { id: string; sources?: ChatSource[] };

const SUGGESTIONS = [
  'Give me a flood demo reply',
  'What should I do in an emergency?',
  'Show saved SentinelAid incident records',
];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  async function ask(question: string) {
    const content = question.trim();
    if (!content || isSending) return;
    const previous = messages;
    setMessages([...previous, { id: makeId(), role: 'user', content }]);
    setDraft('');
    setError(null);
    setIsSending(true);

    try {
      const history = previous.slice(-10).map(({ role, content: text }) => ({ role, content: text }));
      const reply = await chatService.sendMessage(content, history);
      setMessages((current) => [...current, {
        id: makeId(),
        role: 'assistant',
        content: reply.answer,
        sources: reply.sources || [],
      }]);
    } catch (err: any) {
      const message = err?.response?.data?.error?.message
        || err?.response?.data?.detail
        || 'The assistant could not answer right now. Check that the backend is running and try again.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(draft);
  }

  return (
    <div className="min-h-[calc(100vh-48px)] p-4 md:p-6">
      <div className="mx-auto flex h-[calc(100vh-96px)] max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ai-bg text-ai">
            <Bot size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[16px] font-bold text-text-primary">Disaster Assistant</h1>
            <p className="text-[11px] text-text-muted">Prepared replies and local records · no OpenAI key needed</p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full border border-ai/30 bg-ai-bg px-2.5 py-1 text-[10px] font-semibold text-ai sm:flex">
            <Sparkles size={12} /> No-cost demo
          </div>
        </header>

        <section className="flex-1 space-y-5 overflow-y-auto bg-canvas/60 px-4 py-5 md:px-8" aria-live="polite" aria-label="Chat messages">
          {messages.length === 0 && (
            <div className="mx-auto mt-8 max-w-2xl text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ai-bg text-ai">
                <Sparkles size={25} />
              </div>
              <h2 className="text-[22px] font-bold text-text-primary">What would you like to know?</h2>
              <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-text-secondary">
                Try a prepared sample reply or ask to see records stored in SentinelAid. Demo mode does not search the live web or verify current events.
              </p>
              <div className="mt-6 grid gap-2 text-left sm:grid-cols-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void ask(suggestion)}
                    disabled={isSending}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-[12px] text-text-secondary transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
                  >
                    <MessageCircle size={15} className="shrink-0 text-ai" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai-bg text-ai"><Bot size={17} /></div>
              )}
              <div className={`max-w-[88%] rounded-xl px-4 py-3 md:max-w-[760px] ${message.role === 'user' ? 'bg-primary text-white' : 'border border-border bg-surface text-text-primary'}`}>
                <p className="whitespace-pre-wrap text-[13px] leading-6">{message.content}</p>
                {!!message.sources?.length && (
                  <div className="mt-3 border-t border-border/80 pt-2.5">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">Sources</div>
                    <ul className="space-y-1.5">
                      {message.sources.map((source: any, index: number) => (
                        <li key={`${source.url || source.title}-${index}`} className="text-[11px]">
                          {source.url ? (
                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                              <span>{source.title}</span><ExternalLink size={10} />
                            </a>
                          ) : <span className="text-text-muted">{source.title}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nav-secondary text-[11px] font-bold text-white">You</div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-3 text-[12px] text-text-muted">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai-bg text-ai"><Bot size={17} /></div>
              <LoaderCircle size={15} className="animate-spin text-ai" /> Preparing a demo reply…
            </div>
          )}
          {error && (
            <div role="alert" className="mx-auto flex max-w-2xl items-start gap-2 rounded-lg border border-warning-border bg-warning-bg px-3 py-2.5 text-[12px] text-text-secondary">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-warning" />
              <span>{error}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        <div className="border-t border-border bg-surface p-4 md:px-6">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border border-border-input bg-canvas p-2 focus-within:border-primary">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
              maxLength={4000}
              rows={2}
              placeholder="Ask for a sample reply or saved SentinelAid records…"
              aria-label="Your question"
              className="max-h-32 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-[13px] text-text-primary outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={isSending || !draft.trim()}
              aria-label="Send question"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp size={18} />
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-4xl text-[10px] leading-4 text-text-muted">
            Demo only: no live data, web search, or emergency alerts. Verify urgent safety information with local authorities.
          </p>
        </div>
      </div>
    </div>
  );
}
