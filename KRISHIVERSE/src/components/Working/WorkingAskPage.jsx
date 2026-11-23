/**
 * WorkingAskPage.jsx  — KrishiVerse Smart Guided Chatbot
 *
 * Features:
 *  • Claude-style guided diagnosis with predefined option chips
 *  • Instant offline answers from the 15k IndexedDB dataset
 *  • Conversation state machine (GuidedDiagnosisEngine)
 *  • Voice input/output support
 *  • Markdown-rendered AI responses
 *  • New conversation / reset flow
 */

import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  IconSend, IconWifi, IconWifiOff, IconMicrophone,
  IconVolume, IconRefresh, IconLeaf, IconChevronRight,
  IconBulb, IconAlertTriangle
} from "@tabler/icons-react";
import { useOffline } from "../../hooks/useOffline";
import { useVoice } from "../../hooks/useVoice";
import {
  transition, INITIAL_STATE, GREETING, detectIntent,
} from "../../services/ai/GuidedDiagnosisEngine";
import {
  diagnoseFromGuide, warmUpCache,
} from "../../services/ai/IndexedDBChatbotEngine";
import ImprovedChatbotService from "../../services/ai/ImprovedChatbotService";

const chatbotService = new ImprovedChatbotService();

// ─── Simple markdown renderer (no external dep) ───────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1 text-primary">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^• (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-1 space-y-0.5">$&</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ─── Message types ─────────────────────────────────────────────────────────────
const MSG = {
  BOT_OPTIONS: "bot_options",   // guided question with option chips
  BOT_TEXT:    "bot_text",      // AI text result
  BOT_TYPING:  "bot_typing",    // loading indicator
  USER:        "user",          // farmer message
};

// ─── Single chat bubble ────────────────────────────────────────────────────────
const ChatBubble = memo(function ChatBubble({ msg, onOption, onSpeak }) {
  const isUser = msg.type === MSG.USER;

  if (msg.type === MSG.BOT_TYPING) {
    return (
      <div className="chat chat-start">
        <div className="chat-image">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm">
            🌿
          </div>
        </div>
        <div className="chat-bubble chat-bubble-success py-3 px-4">
          <span className="loading loading-dots loading-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={`chat ${isUser ? "chat-end" : "chat-start"}`}>
      {!isUser && (
        <div className="chat-image">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm shadow">
            🌿
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message bubble */}
        <div
          className={`chat-bubble text-sm leading-relaxed ${
            isUser
              ? "chat-bubble-primary"
              : msg.type === MSG.BOT_OPTIONS
              ? "bg-base-100 border border-base-300 text-base-content shadow-sm"
              : msg.isError
              ? "bg-error/10 border border-error/20 text-base-content"
              : "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 text-base-content shadow-sm"
          }`}
        >
          {isUser ? (
            <span>{msg.text}</span>
          ) : (
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
              className="prose prose-sm max-w-none"
            />
          )}
        </div>

        {/* Option chips for guided questions */}
        {msg.type === MSG.BOT_OPTIONS && msg.options && (
          <div className="flex flex-wrap gap-2 w-full mt-1">
            {msg.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onOption(opt)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-500 active:scale-95 transition-all duration-150 shadow-sm text-left flex items-center gap-1.5 group"
              >
                <span>{opt.label}</span>
                <IconChevronRight size={12} className="text-emerald-400 group-hover:text-emerald-600 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Suggestion pills after a result */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onOption({ label: s, value: s })}
                className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 transition-all border border-emerald-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Footer: timestamp + speak */}
        <div className="flex items-center gap-2 opacity-50 text-xs px-1">
          <span>
            {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!isUser && msg.text && msg.text !== "" && (
            <button
              onClick={() => onSpeak(msg.text)}
              className="hover:opacity-100 hover:text-primary"
              title="Listen"
            >
              <IconVolume size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 80 ? "badge-success" : pct >= 50 ? "badge-warning" : "badge-error";
  return (
    <span className={`badge badge-xs ${color} gap-1 ml-2`}>
      {pct}% confidence
    </span>
  );
}

// ─── Header status bar ─────────────────────────────────────────────────────────
function HeaderBar({ isOffline, cacheReady, isListening, onReset }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow">
          <IconLeaf size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold leading-tight">KrishiVerse AI</h2>
          <p className="text-[10px] text-base-content/50 leading-tight">
            {cacheReady ? "15,000 crops & diseases loaded" : "Loading knowledge base..."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {isListening && (
          <span className="badge badge-error badge-sm animate-pulse gap-1">
            🎙 Listening
          </span>
        )}
        {isOffline ? (
          <span className="badge badge-warning badge-sm gap-1">
            <IconWifiOff size={11} /> Offline
          </span>
        ) : (
          <span className="badge badge-success badge-sm gap-1">
            <IconWifi size={11} /> Online
          </span>
        )}
        <button
          className="btn btn-xs btn-ghost text-base-content/50"
          onClick={onReset}
          title="New conversation"
        >
          <IconRefresh size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
let msgId = 0;
const nextId = () => `m${++msgId}`;

export default function WorkingAskPage() {
  const { isOffline } = useOffline();
  const { isListening, transcript, startListening, stopListening, speak, hasSupport } = useVoice();

  const [messages, setMessages]         = useState([]);
  const [convState, setConvState]       = useState(INITIAL_STATE);
  const [input, setInput]               = useState("");
  const [processing, setProcessing]     = useState(false);
  const [cacheReady, setCacheReady]     = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Boot: show greeting + warm up cache ──────────────────────────────────
  useEffect(() => {
    const greetMsg = {
      id: nextId(),
      type: MSG.BOT_OPTIONS,
      text: GREETING.message,
      options: GREETING.options,
      ts: Date.now(),
    };
    setMessages([greetMsg]);

    warmUpCache().then(() => setCacheReady(true)).catch(() => setCacheReady(false));
  }, []);

  // ── Sync voice transcript ────────────────────────────────────────────────
  useEffect(() => {
    if (isListening && transcript) setInput(transcript);
  }, [transcript, isListening]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, processing]);

  // ── Add a bot message helper ─────────────────────────────────────────────
  const addBot = useCallback((partial) => {
    setMessages((prev) => [...prev, { id: nextId(), ts: Date.now(), ...partial }]);
  }, []);

  const addUser = useCallback((text) => {
    setMessages((prev) => [
      ...prev,
      { id: nextId(), type: MSG.USER, text, ts: Date.now() },
    ]);
  }, []);

  const setTyping = useCallback((on) => {
    if (on) {
      setMessages((prev) => [...prev, { id: "__typing__", type: MSG.BOT_TYPING, ts: Date.now() }]);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== "__typing__"));
    }
  }, []);

  // ── Run the IndexedDB query for guided diagnosis ─────────────────────────
  async function runDiagnosis(params) {
    setTyping(true);
    try {
      const result = await diagnoseFromGuide(params);
      setTyping(false);
      addBot({
        type: MSG.BOT_TEXT,
        text: result.response,
        confidence: result.confidence,
        suggestions: result.suggestions,
        isError: result.type === "no_match",
      });
      // After diagnosis, reset for a new question
      setConvState({ ...INITIAL_STATE });
      addBot({
        type: MSG.BOT_OPTIONS,
        text: "Is there anything else I can help you with? 🌱",
        options: [
          { label: "🔬 New diagnosis",       value: "diagnose_start" },
          { label: "💊 Fertilizer advice",   value: "fertilizer advice" },
          { label: "🏛 Government schemes",  value: "government schemes" },
          { label: "❓ Ask something else",  value: "free_ask" },
        ],
        ts: Date.now() + 1,
      });
    } catch (err) {
      setTyping(false);
      addBot({
        type: MSG.BOT_TEXT,
        text: "⚠️ Something went wrong while searching the database. Please try again.",
        isError: true,
      });
    }
  }

  // ── Run free-text NLP query ──────────────────────────────────────────────
  async function runFreeQuery(query) {
    setTyping(true);
    try {
      const result = await chatbotService.getResponse(query);
      setTyping(false);
      addBot({
        type: MSG.BOT_TEXT,
        text: result.response,
        confidence: result.confidence,
        suggestions: result.suggestions || result.followUpQuestions,
        isError: result.type === "fallback" || result.type === "error",
      });
      setConvState({ ...INITIAL_STATE });
    } catch (err) {
      setTyping(false);
      addBot({
        type: MSG.BOT_TEXT,
        text: "⚠️ I couldn't process that. Please try rephrasing.",
        isError: true,
      });
    }
  }

  // ── Process a chip option or free text via the state machine ──────────────
  const processInput = useCallback(async (raw) => {
    if (!raw?.trim() || processing) return;
    const text = raw.trim();

    addUser(text);
    setProcessing(true);

    // ── Special root choices ──────────────────────────────────────────────
    if (text === "diagnose_start") {
      const { newState, botTurn } = transition({ ...INITIAL_STATE }, "diagnose crop problem");
      setConvState(newState);
      addBot({
        type: MSG.BOT_OPTIONS,
        text: botTurn.message,
        options: botTurn.options,
      });
      setProcessing(false);
      return;
    }

    if (text === "free_ask") {
      setConvState({ ...INITIAL_STATE });
      addBot({
        type: MSG.BOT_OPTIONS,
        text: "What would you like to know? Type your question below or pick a category:",
        options: [
          { label: "🌾 Crop cultivation guide", value: "crop cultivation guide" },
          { label: "💊 Fertilizer dosage",       value: "fertilizer dosage" },
          { label: "🔬 Disease identification",  value: "plant disease identification" },
          { label: "💰 Market prices",           value: "mandi market prices today" },
        ],
      });
      setProcessing(false);
      return;
    }

    // ── Run the conversation state machine ────────────────────────────────
    const { newState, botTurn } = transition(convState, text);
    setConvState(newState);

    if (botTurn.type === "options") {
      addBot({
        type: MSG.BOT_OPTIONS,
        text: botTurn.message,
        options: botTurn.options,
      });
      setProcessing(false);
      return;
    }

    if (botTurn.type === "diagnosing") {
      await runDiagnosis({
        crop:     botTurn.crop,
        symptom:  botTurn.symptom,
        severity: botTurn.severity,
        rawText:  botTurn.rawText,
      });
      setProcessing(false);
      return;
    }

    if (botTurn.type === "free_query") {
      await runFreeQuery(text);
      setProcessing(false);
      return;
    }

    // ── Fallback ──────────────────────────────────────────────────────────
    await runFreeQuery(text);
    setProcessing(false);
  }, [convState, processing, addBot, addUser, setTyping]);

  // ── Handle chip press ────────────────────────────────────────────────────
  const handleOption = useCallback((opt) => {
    processInput(opt.value);
  }, [processInput]);

  // ── Handle free-text send ────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    if (!input.trim() || processing) return;
    const q = input.trim();
    setInput("");
    processInput(q);
  }, [input, processing, processInput]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Reset conversation ───────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setMessages([{
      id: nextId(),
      type: MSG.BOT_OPTIONS,
      text: GREETING.message,
      options: GREETING.options,
      ts: Date.now(),
    }]);
    setConvState(INITIAL_STATE);
    setInput("");
  }, []);

  // ─── Step progress indicator ──────────────────────────────────────────────
  const STEPS = ["Crop", "Symptom", "Severity", "Diagnosis"];
  const stepIdx =
    convState.step === "start"        ? -1 :
    convState.step === "ask_crop"     ?  0 :
    convState.step === "ask_symptom"  ?  1 :
    convState.step === "ask_severity" ?  2 :
    convState.step === "diagnosing"   ?  3 : -1;

  return (
    <div className="flex flex-col h-[calc(100vh-190px)]">
      {/* Header */}
      <HeaderBar
        isOffline={isOffline}
        cacheReady={cacheReady}
        isListening={isListening}
        onReset={handleReset}
      />

      {/* Step progress bar (only during guided flow) */}
      {stepIdx >= 0 && (
        <div className="flex items-center gap-1 mb-3 px-1">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                i <= stepIdx ? "text-emerald-600" : "text-base-content/30"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  i < stepIdx  ? "bg-emerald-500 border-emerald-500 text-white" :
                  i === stepIdx ? "bg-emerald-100 border-emerald-500 text-emerald-700 animate-pulse" :
                                 "bg-base-200 border-base-300 text-base-content/30"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className="hidden sm:inline">{step}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < stepIdx ? "bg-emerald-400" : "bg-base-300"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 scrollbar-thin scrollbar-thumb-base-300">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            msg={msg}
            onOption={handleOption}
            onSpeak={speak}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Hint bar: show only during free text mode */}
      {convState.step === "start" || convState.step === "done" ? (
        <div className="flex items-center gap-1.5 text-xs text-base-content/40 mb-2 px-1">
          <IconBulb size={12} />
          <span>Type anything — e.g. <em>"rice yellowing"</em>, or pick a category above.</span>
        </div>
      ) : null}

      {/* Input row */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          className="textarea textarea-bordered flex-1 resize-none text-sm focus:border-emerald-400 transition-colors"
          rows={2}
          placeholder={
            processing     ? "Thinking..." :
            isListening    ? "🎙 Listening..." :
            convState.step === "ask_crop"     ? "Type your crop name..." :
            convState.step === "ask_symptom"  ? "Describe what you see..." :
            convState.step === "ask_severity" ? "Select severity above or type..." :
            "Ask about crops, diseases, schemes, weather..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={processing}
        />
        {hasSupport && (
          <button
            className={`btn btn-circle btn-sm ${isListening ? "btn-error animate-pulse" : "btn-ghost border border-base-300"}`}
            onClick={isListening ? stopListening : startListening}
            aria-label="Voice input"
          >
            <IconMicrophone size={17} />
          </button>
        )}
        <button
          className="btn btn-primary btn-sm px-4"
          onClick={handleSend}
          disabled={!input.trim() || processing}
          aria-label="Send"
        >
          {processing ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <IconSend size={17} />
          )}
        </button>
      </div>

      <p className="text-[10px] text-base-content/30 mt-1 text-center">
        Enter to send · Shift+Enter for new line · 15,000 offline records
      </p>
    </div>
  );
}
