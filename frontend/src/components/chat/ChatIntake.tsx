import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/procurement';
import {
  Send,
  Bot,
  User,
  CheckCircle2,
  Clock,
  Package,
  Building,
  Calendar,
  AlertCircle,
  FileCheck2,
  ShieldCheck,
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
      text: 'Corvo Engineering Procurement Assistant initialized. Specify item descriptions, quantities, plant locations (PUN1 Bhosari or CHK1 Chakan), and required delivery dates.',
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

  const handleConfirmPR = async () => {
    if (!currentDraft) return;
    try {
      const formData = new FormData();
      formData.append('description', currentDraft.item_description || 'General Item');
      formData.append('quantity', String(currentDraft.quantity || 1));
      formData.append('uom', currentDraft.uom || 'NOS');
      formData.append('plant', currentDraft.plant || 'PUN1');
      formData.append('need_by_date', currentDraft.need_by_date || new Date().toISOString().split('T')[0]);
      formData.append('urgency', currentDraft.urgency || 'Normal');
      if (currentDraft.resolved_item_code) {
        formData.append('item_code', currentDraft.resolved_item_code);
      }
      formData.append('requester', 'Aditya Kumar (Plant Intake)');
      formData.append('department', 'Operations');

      const res = await fetch('/api/chat/confirm', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      onShowToast('success', 'Requisition Created', `Requisition ${data.pr_no || 'PR'} created and routed to Buyer Workspace.`);
      onPRConfirmed();
    } catch (err) {
      onShowToast('error', 'Submission Error', 'Failed to submit requisition to engine.');
    }
  };

  const samplePrompts = [
    'Need 200 pairs of nitrile coated gloves for Chakan plant by next Friday',
    'Emergency breakdown! Need 10 hydraulic hoses for Bhosari by tomorrow morning',
    'Order 50 deep groove ball bearings 6205 for Pune line 2',
    'Request 2 CNC machine workholding fixtures for Bhosari',
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-4 bg-[#F5F6F8]">
      {/* Page Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#202B38]">
            Chat Intake
          </h1>
        </div>

        <div>
          {engineMode === 'gemini_2.0_flash' ? (
            <span className="px-2.5 py-1 rounded-[4px] text-xs font-mono font-medium bg-[#EBF1FD] text-[#315FCE] border border-[#C7D7F9] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315FCE]"></span>
              <span>Gemini 2.0 Flash</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-[4px] text-xs font-mono font-medium bg-white text-[#687586] border border-[#E1E5EA] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16845B]"></span>
              <span>Deterministic Engine</span>
            </span>
          )}
        </div>
      </div>

      {/* Split Pane: 60% Left Chat + 40% Right Inspector */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden">
        {/* Left Pane (60%): Conversational Chat Thread */}
        <div className="col-span-7 bg-white border border-[#E1E5EA] rounded-[4px] flex flex-col overflow-hidden">
          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-[3px] flex items-center justify-center shrink-0 text-xs font-semibold ${
                    msg.sender === 'user'
                      ? 'bg-[#315FCE] text-white'
                      : 'bg-[#F5F6F8] text-[#202B38] border border-[#E1E5EA]'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3 rounded-[4px] text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#EBF1FD] text-[#202B38] border border-[#C7D7F9]'
                        : 'bg-[#F5F6F8] text-[#202B38] border border-[#E1E5EA]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#8D99A8] px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-[3px] bg-[#F5F6F8] border border-[#E1E5EA] flex items-center justify-center text-[#315FCE]">
                  <Bot className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-[#F5F6F8] border border-[#E1E5EA] p-2.5 rounded-[4px] text-xs text-[#687586] font-mono">
                  Grounding against catalog and parsing parameters...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips */}
          <div className="p-2.5 bg-[#F5F6F8] border-t border-[#E1E5EA] flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-semibold text-[#687586] uppercase tracking-wider shrink-0">
              Quick Input:
            </span>
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-[11px] text-[#202B38] bg-white hover:bg-[#E1E5EA] border border-[#E1E5EA] px-2.5 py-1 rounded-[3px] whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-2.5 bg-white border-t border-[#E1E5EA] flex gap-2">
            <input
              type="text"
              placeholder="Type your purchase requisition (e.g. need 200 gloves for Chakan next Friday)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[4px] px-3 h-9 text-xs text-[#202B38] placeholder-[#8D99A8] focus:outline-none focus:border-[#315FCE]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="bg-[#315FCE] hover:bg-[#254DB0] text-white px-3.5 h-9 rounded-[4px] text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Right Pane (40%): Requisition Ledger / Real-Time Inspector */}
        <div className="col-span-5 flex flex-col gap-3 overflow-y-auto">
          {/* Live Extraction Ledger Card */}
          <div className="bg-white border border-[#E1E5EA] rounded-[4px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E1E5EA]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-[#315FCE]" />
                <span className="text-xs font-semibold text-[#202B38] uppercase tracking-wider">
                  Requisition Ledger
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#687586] bg-[#F5F6F8] border border-[#E1E5EA] px-1.5 py-0.2 rounded">
                Live Parameters
              </span>
            </div>

            {/* Checklist of Core Fields */}
            <div className="flex flex-col gap-2">
              {/* Item Code */}
              <div className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-[#687586]" />
                  <span className="text-xs text-[#202B38]">Item Identification</span>
                </div>
                <div className="font-mono text-xs text-right">
                  {currentDraft?.resolved_item_code ? (
                    <span className="text-[#16845B] font-semibold">{currentDraft.resolved_item_code}</span>
                  ) : (
                    <span className="text-[#8D99A8] italic">Pending detection</span>
                  )}
                </div>
              </div>

              {/* Plant */}
              <div className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-[#687586]" />
                  <span className="text-xs text-[#202B38]">Destination Plant</span>
                </div>
                <div className="font-mono text-xs text-right">
                  {currentDraft?.plant ? (
                    <span className="text-[#315FCE] font-semibold">{currentDraft.plant}</span>
                  ) : (
                    <span className="text-[#8D99A8] italic">Pending selection</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#687586]" />
                  <span className="text-xs text-[#202B38]">Quantity & UoM</span>
                </div>
                <div className="font-mono text-xs text-right">
                  {currentDraft?.quantity ? (
                    <span className="text-[#202B38] font-semibold tabular-nums">
                      {currentDraft.quantity} {currentDraft.uom}
                    </span>
                  ) : (
                    <span className="text-[#8D99A8] italic">Pending quantity</span>
                  )}
                </div>
              </div>

              {/* Need-by Date */}
              <div className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#687586]" />
                  <span className="text-xs text-[#202B38]">Need-by Date</span>
                </div>
                <div className="font-mono text-xs text-right">
                  {currentDraft?.need_by_date ? (
                    <span className="text-[#202B38] font-semibold tabular-nums">{currentDraft.need_by_date}</span>
                  ) : (
                    <span className="text-[#8D99A8] italic">Pending schedule</span>
                  )}
                </div>
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-between p-2 bg-[#F5F6F8] border border-[#E1E5EA] rounded-[3px]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-[#687586]" />
                  <span className="text-xs text-[#202B38]">Priority Level</span>
                </div>
                <div className="font-mono text-xs text-right">
                  {currentDraft?.urgency === 'Emergency' ? (
                    <span className="text-[#C74747] font-semibold bg-[#FDF0F0] border border-[#F7C6C6] px-1.5 py-0.2 rounded">
                      Emergency (Breakdown)
                    </span>
                  ) : (
                    <span className="text-[#687586]">Normal Priority</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ready Confirmation Box */}
            {currentDraft?.ready_to_submit && (
              <div className="p-3 bg-[#E8F5EE] border border-[#B6E2CC] rounded-[4px] flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-[#16845B] text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Requisition Parameters Verified</span>
                </div>
                <p className="text-[11px] text-[#202B38] leading-relaxed">
                  All mandatory procurement fields detected. Ready to draft purchase requisition into decision engine.
                </p>
                <button
                  onClick={handleConfirmPR}
                  className="w-full bg-[#16845B] hover:bg-[#126B49] text-white font-semibold text-xs h-8 rounded-[4px] transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-1"
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
