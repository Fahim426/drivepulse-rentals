import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  Calendar,
  AlertTriangle,
  CreditCard,
  Car,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface ActionButton {
  label: string;
  action: string;
  url: string;
  variant?: 'primary' | 'secondary' | 'warning';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ActionButton[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🚗 Available Fleet', query: 'Which vehicles are available right now?' },
  { label: '⏳ Rental Remaining Time', query: 'Which vehicles are currently on rent and how many days are remaining?' },
  { label: '⚠️ Expiring Documents', query: 'Are any vehicle insurance, fitness, or PUC documents expiring soon?' },
  { label: '💰 Today Collections', query: 'How much money did we collect today?' },
  { label: '💳 Unpaid Balances', query: 'Who owes us money and what are the pending balances?' },
  { label: '📊 Fleet Utilization', query: 'Give me a complete fleet overview and utilization percentage' },
];

export const AICopilotModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.data.reply,
          actions: data.data.actions,
          timestamp: data.data.timestamp || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.message || 'Failed to get AI response');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Unable to process query**: ${err.message || 'Please check connection.'}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: ActionButton) => {
    if (action.action === 'prompt') {
      handleSend(action.url);
    } else if (action.action === 'navigate') {
      onClose();
      navigate(action.url);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end sm:pr-6 sm:pb-6 pointer-events-none">
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm sm:hidden pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Copilot Drawer / Modal Card */}
      <div
        className={`pointer-events-auto flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 w-full sm:w-[440px] ${
          isExpanded
            ? 'sm:w-[620px] h-[92vh] sm:rounded-3xl'
            : 'h-[85vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl'
        } overflow-hidden`}
      >
        {/* Header Bar */}
        <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  DrivePulse AI Copilot
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Ops
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80">Real-time fleet & bookings assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-300">
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:inline-flex p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              title={isExpanded ? 'Collapse' : 'Expand window'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              title="Close Copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
          {messages.length === 0 ? (
            <div className="py-6 px-2 text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  How can I help you today?
                </h4>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  Ask about live vehicle availability, rental return timers, expiring documents, or cashier collections.
                </p>
              </div>

              {/* Quick Prompt Pills */}
              <div className="pt-2 text-left space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Suggested Questions
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(qp.query)}
                      className="w-full text-left p-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-indigo-50/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center justify-between group shadow-sm"
                    >
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {qp.label}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-xs space-y-1">
                    {m.content.split('\n').map((line, idx) => {
                      if (line.startsWith('• ') || line.startsWith('- ')) {
                        return (
                          <div key={idx} className="flex items-start gap-1.5 pl-1">
                            <span className="text-indigo-500">•</span>
                            <span>{renderFormattedText(line.slice(2))}</span>
                          </div>
                        );
                      }
                      return <p key={idx}>{renderFormattedText(line)}</p>;
                    })}
                  </div>

                  {/* Action buttons if provided */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800">
                      {m.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(act)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition shadow-sm ${
                            act.variant === 'primary'
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : act.variant === 'warning'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span
                    className={`text-[9px] block text-right ${
                      m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-slate-400 pl-2 py-2 animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span className="text-xs font-semibold">DrivePulse AI is checking live fleet data...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything (e.g. Is Creta available? Who owes money?)..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-100 dark:bg-slate-800/80 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition flex items-center justify-center shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Powered by DrivePulse Real-time Operations Engine</span>
            <span className="hidden sm:inline">Press Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Basic markdown bold parser helper
 */
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
