import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/procurement';
import { Send, Bot, User, Sparkles, CheckCircle, Clock, MapPin, Package } from 'lucide-react';

interface ChatIntakeProps {
  onPRConfirmed: () => void;
}

export const ChatIntake: React.FC<ChatIntakeProps> = ({ onPRConfirmed }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am your Corvo Procurement Assistant. What items or materials do you need for your plant today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('session_id', 'react_user_session');

      const res = await fetch('/api/chat/intake', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data.reply || data.assistant_reply || 'Understood.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        draft_pr: data.draft_pr,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Sorry, I encountered an issue connecting to the procurement engine.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPR = () => {
    alert('Requisition successfully submitted to the Corvo Procurement Engine! Check the Buyer Workspace.');
    onPRConfirmed();
  };

  const samplePrompts = [
    'Need 200 nitrile gloves for Chakan plant by next Friday',
    'Order 50 deep groove ball bearings 6205 for Bhosari',
    'Emergency 10 hydraulic hoses for Chakan breakdown',
    'Request 2 CNC machine workholding fixtures for Pune',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4">
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Conversational Requisition Intake
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Type your purchase requests naturally. The assistant matches master catalog items, resolves plants, and drafts compliant requisitions.
        </p>
      </div>

      {/* Chat Messages Viewport */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[80%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-blue-400 border border-slate-700'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="flex flex-col gap-1.5">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-850 text-slate-200 border border-slate-750 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Confirmed Draft PR Card */}
                  {msg.draft_pr && msg.draft_pr.ready_to_submit && (
                    <div className="mt-3 pt-3 border-t border-slate-700/80 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Ready to Submit to Procurement Engine</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] grid grid-cols-2 gap-2 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[10px]">ITEM</span>
                          <span className="text-white font-semibold">
                            {msg.draft_pr.resolved_item_code}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">PLANT</span>
                          <span className="text-white font-semibold">{msg.draft_pr.plant}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">QUANTITY</span>
                          <span className="text-white font-semibold">
                            {msg.draft_pr.quantity} {msg.draft_pr.uom}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">NEED-BY</span>
                          <span className="text-white font-semibold">{msg.draft_pr.need_by_date}</span>
                        </div>
                      </div>
                      <button
                        onClick={handleConfirmPR}
                        className="mt-1 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Submit Requisition</span>
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 px-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-850 border border-slate-750 p-3 rounded-2xl rounded-tl-none text-xs text-slate-400">
                Analyzing request and checking policy rules...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-3 bg-slate-850/40 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Try:</span>
          </span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder="Type your purchase request (e.g. need 500 fasteners for Bhosari next week)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-slate-850 border border-slate-700 rounded-lg px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
