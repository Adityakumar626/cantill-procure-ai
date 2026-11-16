import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/procurement';
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Shield,
  FileCheck2,
  AlertCircle,
  Calendar,
  Building,
} from 'lucide-react';

interface ChatIntakeProps {
  onPRConfirmed: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const ChatIntake: React.FC<ChatIntakeProps> = ({ onPRConfirmed, onShowToast }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello. I am the Corvo Procurement Intake Assistant. What materials, equipment, or spares do you need for your plant today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [engineMode, setEngineMode] = useState<string>('offline_deterministic');
  const [currentDraft, setCurrentDraft] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.llm_mode) setEngineMode(data.llm_mode);
      })
      .catch(() => {});
  }, []);

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
      formData.append('session_id', 'buyer_live_session');

      const res = await fetch('/api/chat/intake', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.engine_mode) setEngineMode(data.engine_mode);
      if (data.draft_pr) setCurrentDraft(data.draft_pr);

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
          text: 'Error connecting to procurement engine.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPR = () => {
    onShowToast('success', 'Requisition Created', `PR successfully submitted to Corvo Engine and routed to Buyer Workspace.`);
    onPRConfirmed();
  };

  const samplePrompts = [
    'Need 200 pairs of nitrile coated gloves for Chakan plant by next Friday',
    'Emergency breakdown! Need 10 hydraulic hoses for Bhosari by tomorrow morning',
    'Order 50 deep groove ball bearings 6205 for Pune line 2',
    'Request 2 CNC machine workholding fixtures for Bhosari',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-7 gap-6 bg-[#090d16]">
      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Conversational Requisition Intake
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Employees raise purchase requests naturally. Gemini 2.0 extracts entities and maps catalog items in real time.
          </p>
        </div>

        <div>
          {engineMode === 'gemini_2.0_flash' ? (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI Mode: Gemini 2.0 Flash (Active)</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Mode: Deterministic Engine (Offline Safe)</span>
            </span>
          )}
        </div>
      </div>

      {/* Split Pane: 60% Left Chat + 40% Right Inspector */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left Pane (60%): Conversational Chat Thread */}
        <div className="col-span-7 bg-[#111827] border border-white/[0.08] rounded-[10px] flex flex-col overflow-hidden">
          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 text-xs font-medium ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#161f30] text-blue-400 border border-white/[0.08]'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3.5 rounded-[10px] text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#161f30] text-slate-200 border border-white/[0.08]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-[6px] bg-[#161f30] border border-white/[0.08] flex items-center justify-center text-blue-400">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-[#161f30] border border-white/[0.08] p-3 rounded-[10px] text-xs text-slate-400 font-mono">
                  Grounding against catalog and evaluating policy...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips */}
          <div className="p-3 bg-[#0d131f] border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Try:</span>
            </span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-[11px] text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2.5 py-1 rounded-[6px] whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#111827] border-t border-white/[0.08] flex gap-2">
            <input
              type="text"
              placeholder="Type your purchase requisition (e.g. need 200 gloves for Chakan next Friday)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-[#161f30] border border-white/[0.08] rounded-[6px] px-3.5 h-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 h-10 rounded-[6px] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Pane (40%): Real-Time Requisition Inspector */}
        <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
          {/* Live Extraction Inspector Card */}
          <div className="bg-[#111827] border border-white/[0.08] rounded-[10px] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Requisition Inspector
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded">
                Live State
              </span>
            </div>

            {/* Checklist of Core Fields */}
            <div className="flex flex-col gap-3">
              {/* Item Code */}
              <div className="flex items-center justify-between p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Target Item</span>
                </div>
                <div className="font-mono text-xs font-medium text-right">
                  {currentDraft?.resolved_item_code ? (
                    <span className="text-emerald-400 font-semibold">{currentDraft.resolved_item_code}</span>
                  ) : (
                    <span className="text-slate-500 italic">Pending detection</span>
                  )}
                </div>
              </div>

              {/* Plant */}
              <div className="flex items-center justify-between p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Destination Plant</span>
                </div>
                <div className="font-mono text-xs font-medium text-right">
                  {currentDraft?.plant ? (
                    <span className="text-blue-400 font-semibold">{currentDraft.plant}</span>
                  ) : (
                    <span className="text-slate-500 italic">Pending selection</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Quantity & UoM</span>
                </div>
                <div className="font-mono text-xs font-medium text-right">
                  {currentDraft?.quantity ? (
                    <span className="text-white font-semibold">
                      {currentDraft.quantity} {currentDraft.uom}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Pending quantity</span>
                  )}
                </div>
              </div>

              {/* Need-by Date */}
              <div className="flex items-center justify-between p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Need-by Date</span>
                </div>
                <div className="font-mono text-xs font-medium text-right">
                  {currentDraft?.need_by_date ? (
                    <span className="text-white font-semibold">{currentDraft.need_by_date}</span>
                  ) : (
                    <span className="text-slate-500 italic">Pending schedule</span>
                  )}
                </div>
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-between p-2.5 bg-[#161f30] border border-white/[0.06] rounded-[6px]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-300">Urgency Classification</span>
                </div>
                <div className="font-mono text-xs font-medium text-right">
                  {currentDraft?.urgency === 'Emergency' ? (
                    <span className="text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-1.5 py-0.2 rounded">
                      Emergency (Breakdown)
                    </span>
                  ) : (
                    <span className="text-slate-300">Normal Priority</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ready Confirmation Box */}
            {currentDraft?.ready_to_submit && (
              <div className="mt-2 p-4 bg-emerald-500/[0.06] border border-emerald-500/25 rounded-[8px] flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All Policy Prerequisites Verified</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Requisition is complete and verified against Corvo catalog rules. Ready to generate draft PR and route into policy engine.
                </p>
                <button
                  onClick={handleConfirmPR}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 rounded-[6px] transition-colors flex items-center justify-center gap-2"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Submit Requisition to Engine</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
