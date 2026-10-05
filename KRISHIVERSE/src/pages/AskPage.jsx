import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  FlowerLotus,
  PaperPlaneRight,
  WifiHigh,
  WifiSlash,
  Leaf,
  Cpu,
  SpeakerHigh,
  Microphone,
  Sparkle,
} from "@phosphor-icons/react";
import { useAdvisory } from "../hooks/useAdvisory";
import { useOffline } from "../hooks/useOffline";
import { useConnectivity } from "../hooks/useConnectivity";
import { useVoice } from "../hooks/useVoice";
import {
  resolveGuidedFlowLocally,
  warmUpCache,
} from "../services/ai/aiRouter";
import {
  preloadOnDeviceChat,
  setInitProgressHandler,
  isWebGpuSupported,
  isOnDeviceEnabled,
  isOnDeviceChatReady,
} from "../services/ai/onDeviceChatEngine";
import {
  FOLLOW_UP_SUGGESTIONS,
  GUIDED_FLOWS,
  GUIDED_ROOT_CATEGORIES,
} from "../features/chat/guidedHelpConfig";

function askMessageToUi(msg) {
  return {
    id: msg.id,
    role: msg.role === "assistant" ? "assistant" : "user",
    text: msg.text,
    ts: msg.timestamp,
    metadata: msg.metadata || {},
    source: "history",
  };
}

function optionMessage({ id, text, options, ts = Date.now() }) {
  return {
    id,
    role: "assistant",
    text,
    ts,
    options,
    source: "guided",
  };
}

function textMessage({ id, role = "assistant", text, ts = Date.now(), tone = "default" }) {
  return {
    id,
    role,
    text,
    ts,
    tone,
    source: "guided",
  };
}

function renderStructuredText(text) {
  if (!text) return null;
  const sectionNames = ["Problem", "Reason", "Recommended Action", "Prevention", "Need more help?"];
  const lines = String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [];
  let current = null;

  for (const line of lines) {
    const matchedHeading = sectionNames.find((name) => line.toLowerCase() === name.toLowerCase());
    if (matchedHeading) {
      current = { heading: matchedHeading, lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: null, lines: [] };
      sections.push(current);
    }
    current.lines.push(line.replace(/^[-*]\s*/, ""));
  }

  if (!sections.some((section) => section.heading)) {
    return <p className="whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={`${section.heading || "body"}-${idx}`} className="space-y-1">
          {section.heading && (
            <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--kv-green)]">
              {section.heading}
            </h4>
          )}
          <div className="space-y-1.5">
            {section.lines.map((line, lineIdx) => (
              <p key={lineIdx} className="text-[14px] leading-relaxed text-[var(--kv-near-black)]">
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AskPage() {
  const { messages, loading, error, ragStatus, ask, clearError } = useAdvisory();
  const { isOffline } = useOffline();
  const { isOffline: connOffline, isUncertain } = useConnectivity();
  const { isListening, transcript, startListening, stopListening, speak, hasSupport } = useVoice();
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const [guidedMessages, setGuidedMessages] = useState([]);
  const [guidedSheetOpen, setGuidedSheetOpen] = useState(false);
  const [guidedNodeStack, setGuidedNodeStack] = useState([]);
  const [activeFlow, setActiveFlow] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [guidedAnswers, setGuidedAnswers] = useState({});
  const msgCounter = useRef(0);
  const [onDeviceStatus, setOnDeviceStatus] = useState("idle");
  const [onDeviceProgress, setOnDeviceProgress] = useState(0);

  const nextGuidedId = () => `guided-${Date.now()}-${++msgCounter.current}`;

  // Warm up the on-device LLM in the background so offline chat is ready.
  useEffect(() => {
    if (!isOnDeviceEnabled() || !isWebGpuSupported()) {
      setOnDeviceStatus(isOnDeviceEnabled() ? "unsupported" : "disabled");
      return undefined;
    }
    if (isOnDeviceChatReady()) {
      setOnDeviceStatus("ready");
      return undefined;
    }
    if (isOffline) return undefined;

    setOnDeviceStatus("downloading");
    setInitProgressHandler((p) => {
      const pct = Math.round((p?.progress || 0) * 100);
      setOnDeviceProgress(Math.min(pct, 99));
      if (pct >= 100) setOnDeviceStatus("ready");
    });
    preloadOnDeviceChat()
      .then((engine) => {
        setOnDeviceStatus(engine ? "ready" : "unsupported");
      })
      .catch(() => setOnDeviceStatus("unsupported"));
    return () => setInitProgressHandler(null);
  }, [isOffline]);

  // Sync voice transcript to input
  useEffect(() => {
    if (isListening && transcript) {
      setInput(transcript);
    }
  }, [transcript, isListening]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, guidedMessages]);

  useEffect(() => {
    warmUpCache().catch(() => {});
  }, []);

  const addGuidedMessage = (message) => {
    setGuidedMessages((prev) => [...prev, message]);
  };

  const startFlow = (flowId, initialAnswers = {}, breadcrumbLabel) => {
    const flow = GUIDED_FLOWS[flowId];
    if (!flow) return;

    const introTs = Date.now();
    const firstStep = flow.steps[0];
    setGuidedSheetOpen(false);
    setActiveFlow(flowId);
    setActiveStepIndex(0);
    setGuidedAnswers(initialAnswers);

    addGuidedMessage(textMessage({
      id: nextGuidedId(),
      role: "user",
      text: breadcrumbLabel,
      ts: introTs,
    }));

    addGuidedMessage(textMessage({
      id: nextGuidedId(),
      text: flow.intro,
      ts: introTs + 1,
    }));

    addGuidedMessage(optionMessage({
      id: nextGuidedId(),
      text: firstStep.question,
      options: firstStep.options,
      ts: introTs + 2,
    }));
  };

  const submitGuidedPrompt = async (answers) => {
    const flow = GUIDED_FLOWS[activeFlow];
    if (!flow) return;
    const localQuery = flow.buildLocalQuery?.(answers) || Object.values(answers).join(" ");

    setActiveFlow(null);
    setActiveStepIndex(-1);

    try {
      const { result: localResult } = await resolveGuidedFlowLocally({
        flowId: activeFlow,
        answers,
        localQuery,
        context: {
          // No default district: location stays unknown unless the farmer picks one.
          season: answers.growthStage || answers.recentWeather || answers.goal,
        },
      });

      addGuidedMessage(textMessage({
        id: nextGuidedId(),
        text: localResult?.response || "I found a local answer for your question.",
        tone: localResult?.type === "no_match" ? "error" : "default",
      }));

      addGuidedMessage(optionMessage({
        id: nextGuidedId(),
        text: "Need more help?",
        options: FOLLOW_UP_SUGGESTIONS.map((label) => ({ label, value: label })),
      }));
    } catch (err) {
      addGuidedMessage(textMessage({
        id: nextGuidedId(),
        text: `I could not complete that request right now. ${err?.message || "Please try again."}`,
        tone: "error",
      }));
    }
  };

  const handleGuidedOption = async (option, meta = {}) => {
    const label = option.label || option.value;
    if (meta.kind === "follow-up") {
      setInput(label);
      return;
    }

    const now = Date.now();
    addGuidedMessage(textMessage({
      id: nextGuidedId(),
      role: "user",
      text: label,
      ts: now,
    }));

    if (activeFlow && activeStepIndex >= 0) {
      const flow = GUIDED_FLOWS[activeFlow];
      const step = flow.steps[activeStepIndex];
      const nextAnswers = { ...guidedAnswers, [step.key]: option.value };
      setGuidedAnswers(nextAnswers);

      const nextStepIndex = activeStepIndex + 1;
      if (nextStepIndex >= flow.steps.length) {
        await submitGuidedPrompt(nextAnswers);
        return;
      }

      const nextStep = flow.steps[nextStepIndex];
      setActiveStepIndex(nextStepIndex);
      addGuidedMessage(optionMessage({
        id: nextGuidedId(),
        text: nextStep.question,
        options: nextStep.options,
        ts: now + 1,
      }));
      return;
    }
  };

  async function handleSend() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    try {
      await ask(q);
    } catch (err) {
      console.warn("Ask failed:", err);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const uiMessages = useMemo(() => {
    const merged = [
      ...messages.map(askMessageToUi),
      ...guidedMessages,
    ];
    return merged.sort((a, b) => a.ts - b.ts);
  }, [messages, guidedMessages]);

  const currentSheetNodes = guidedNodeStack.length === 0
    ? GUIDED_ROOT_CATEGORIES
    : guidedNodeStack[guidedNodeStack.length - 1].children || [];

  const sheetTitle = guidedNodeStack.length === 0
    ? "Guided Help"
    : guidedNodeStack[guidedNodeStack.length - 1].label;

  useEffect(() => {
    if (!guidedSheetOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setGuidedSheetOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [guidedSheetOpen]);

  return (
    <div className="flex flex-col h-[calc(100vh-136px)] pt-2">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--kv-green-light)] text-[var(--kv-green)] flex items-center justify-center shadow-sm">
            <Sparkle size={22} weight="fill" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold font-[var(--font-heading)] text-[var(--kv-near-black)] flex items-center gap-2">
              KrishiVerse AI
            </h1>
            <p className="text-[12px] text-[var(--kv-grey-mid)] mt-0.5">
              One farming conversation. Type, speak, or use guided help.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onDeviceStatus === "downloading" && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--kv-blue)] bg-[var(--kv-blue-light)] px-2.5 py-1 rounded-full">
              <Cpu size={13} weight="bold" className="kv-animate-pulse" />
              <span>On-device AI {onDeviceProgress}%</span>
            </div>
          )}
          {onDeviceStatus === "ready" && (
            <div className="kv-chip kv-chip-green" title="Qwen2.5-3B loaded — answers work fully offline">
              <Cpu size={14} weight="bold" />
              <span>On-device AI</span>
            </div>
          )}
          {onDeviceStatus === "unsupported" && (
            <div className="kv-chip kv-chip-amber" title="WebGPU not available — this device uses cloud/local answers">
              <Cpu size={14} weight="bold" />
              <span>Cloud AI</span>
            </div>
          )}
          {ragStatus === "loading" && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--kv-blue)] bg-[var(--kv-blue-light)] px-2.5 py-1 rounded-full">
              <span className="kv-animate-pulse">Loading Local AI...</span>
            </div>
          )}
          {connOffline ? (
            <div className={`kv-chip ${ragStatus === "ready" ? "kv-chip-green" : "kv-chip-amber"}`}>
              <WifiSlash size={14} weight="bold" />
              <span>{ragStatus === "ready" ? "Local AI" : "Offline"}</span>
            </div>
          ) : isUncertain ? (
            <div className="kv-chip kv-chip-amber">
              <WifiHigh size={14} weight="bold" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="kv-chip kv-chip-green">
              <WifiHigh size={14} weight="bold" />
              <span>Online</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-[var(--kv-red-light)] text-[var(--kv-red)] px-3 py-2 rounded-xl mb-3 text-[13px] flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="p-1 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 mb-3 scrollbar-hide flex flex-col pt-2">
        {uiMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-10">
            <div className="w-18 h-18 rounded-[28px] bg-[var(--kv-green-light)] flex items-center justify-center text-[var(--kv-green)] shadow-sm">
              <Leaf size={34} weight="duotone" />
            </div>
            <div className="text-center max-w-[320px]">
              <h3 className="text-[18px] font-bold text-[var(--kv-near-black)]">Welcome to KrishiVerse AI</h3>
              <p className="text-[13px] text-[var(--kv-grey-mid)] mt-2 leading-relaxed">
                Ask anything about crops, pests, fertilizer, irrigation, weather, prices, or schemes.
                If you are not sure how to ask, use Guided Help.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-[360px] mt-2">
              {["Rice not growing", "Banana leaf dry", "Best fertilizer", "Weather for spraying"].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-left px-3 py-3 rounded-2xl bg-white border border-[var(--kv-divider)] shadow-sm text-[13px] text-[var(--kv-near-black)] hover:border-[var(--kv-green)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
        {uiMessages.map((msg) => {
          const isUser = msg.role === "user";
          const isLocal = msg.metadata?.model === "local-bot" || msg.metadata?.offline;
          const isError = msg.tone === "error";

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${isUser ? "self-end items-end" : "self-start items-start"}`}
            >
              <div
                className={`py-3 px-4 rounded-[22px] text-[14px] leading-relaxed relative ${
                  isUser
                    ? "bg-[var(--kv-green)] text-white font-medium rounded-br-md shadow-sm"
                    : isError
                      ? "bg-[var(--kv-red-light)] border border-[var(--kv-red)]/20 text-[var(--kv-near-black)] rounded-bl-md shadow-sm"
                      : "bg-white border border-[var(--kv-divider)] text-[var(--kv-near-black)] rounded-bl-md shadow-sm"
                }`}
              >
                {isLocal && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--kv-amber)] mb-1">
                    <WifiSlash size={12} weight="bold" /> LOCAL AI
                  </div>
                )}
                {!isUser && msg.metadata?.validation?.level && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--kv-grey-mid)] mb-1">
                    {msg.metadata.validation.level === "HIGH" ? "🟢" : msg.metadata.validation.level === "MEDIUM" ? "🟡" : "🟠"}{" "}
                    {msg.metadata.validation.level} confidence
                  </div>
                )}
                {msg.text === "__OFFLINE__"
                  ? <span className="italic opacity-80">No internet connection. Your question was saved and will be retried later.</span>
                  : isUser
                    ? <span>{msg.text}</span>
                    : renderStructuredText(msg.text)}
                {!isUser && msg.options?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.options.map((option) => (
                      <button
                        key={`${msg.id}-${option.value}`}
                        onClick={() => handleGuidedOption(option, {
                          kind: activeFlow ? "guided" : "follow-up",
                        })}
                        className="px-3 py-2 rounded-full bg-[var(--kv-green-light)] text-[var(--kv-green)] text-[12px] font-semibold border border-[var(--kv-green)]/15 hover:bg-[var(--kv-green)] hover:text-white transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 opacity-60 px-1">
                <span className="text-[10px] font-semibold">
                  {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {!isUser && msg.text !== "__OFFLINE__" && !msg.options?.length && (
                  <button 
                    onClick={() => speak(msg.text)} 
                    className="p-1 hover:text-[var(--kv-green)] transition-colors"
                    aria-label="Read assistant response aloud"
                  >
                    <SpeakerHigh size={14} weight="bold" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {loading && (
          <div className="self-start max-w-[85%] flex flex-col items-start">
            <div className="py-3 px-4 rounded-[22px] rounded-bl-md bg-white border border-[var(--kv-divider)] shadow-sm flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] kv-animate-pulse" style={{ animationDelay: "0ms" }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] kv-animate-pulse" style={{ animationDelay: "150ms" }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--kv-green)] kv-animate-pulse" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      <button
        onClick={() => {
          setGuidedSheetOpen(true);
          setGuidedNodeStack([]);
        }}
        className="w-full mb-3 rounded-[22px] bg-[var(--kv-green-light)] text-[var(--kv-green)] px-4 py-4 font-semibold text-[15px] flex items-center justify-center gap-2 border border-[var(--kv-green)]/15 shadow-sm hover:bg-[var(--kv-green)] hover:text-white transition-colors"
      >
        <FlowerLotus size={20} weight="fill" />
        Guided Help
      </button>

      <div className="flex items-end gap-2 bg-white rounded-[24px] p-2 border border-[var(--kv-divider)] shadow-sm focus-within:border-[var(--kv-green)] transition-colors relative z-10">
        <textarea
          className="flex-1 bg-transparent border-none resize-none px-3 py-3 text-[15px] text-[var(--kv-near-black)] outline-none min-h-[46px] max-h-[140px]"
          rows={1}
          aria-label="Ask a farming question"
          placeholder={isListening ? "Listening..." : "Ask anything about farming..."}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        {hasSupport && (
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              isListening ? "bg-[var(--kv-red-light)] text-[var(--kv-red)]" : "bg-[var(--kv-off-white)] text-[var(--kv-grey-dark)]"
            }`}
            aria-label="Voice input"
          >
            <Microphone size={22} weight={isListening ? "fill" : "regular"} className={isListening ? "kv-animate-pulse" : ""} />
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="w-11 h-11 shrink-0 rounded-full bg-[var(--kv-green)] text-white flex items-center justify-center disabled:opacity-50 disabled:bg-[var(--kv-divider)] disabled:text-[var(--kv-grey-mid)] transition-colors shadow-sm"
          aria-label="Send message"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <PaperPlaneRight size={20} weight="fill" />
          )}
        </button>
      </div>

      <p className="text-[10px] text-[var(--kv-grey-mid)] mt-2 text-center">
        Use typing, voice, or guided help in the same conversation.
      </p>

      {guidedSheetOpen && (
        <>
          <div className="kv-sheet-overlay" onClick={() => setGuidedSheetOpen(false)} />
          <div
            className="kv-sheet block md:hidden"
            style={{ maxHeight: "84vh" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guided-help-title-mobile"
          >
            <div className="kv-sheet-handle" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {guidedNodeStack.length > 0 && (
                    <button
                      onClick={() => setGuidedNodeStack((prev) => prev.slice(0, -1))}
                      className="w-9 h-9 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center"
                    >
                      <CaretLeft size={18} />
                    </button>
                  )}
                  <div>
                    <h3 id="guided-help-title-mobile" className="text-[18px] font-bold text-[var(--kv-near-black)]">{sheetTitle}</h3>
                    <p className="text-[12px] text-[var(--kv-grey-mid)]">Choose a path and I will guide you step by step.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pb-4">
                {currentSheetNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (node.children?.length) {
                        setGuidedNodeStack((prev) => [...prev, node]);
                        return;
                      }
                      startFlow(
                        node.flowId,
                        node.initialAnswers,
                        [...guidedNodeStack.map((item) => item.label), node.label].join(" > "),
                      );
                    }}
                    className="text-left rounded-[20px] border border-[var(--kv-divider)] bg-white p-4 shadow-sm hover:border-[var(--kv-green)] transition-colors"
                  >
                    <div className="text-[24px] mb-2">{node.icon}</div>
                    <div className="text-[14px] font-semibold text-[var(--kv-near-black)]">{node.label}</div>
                    <div className="mt-2 text-[11px] text-[var(--kv-grey-mid)] flex items-center gap-1">
                      <span>{node.children?.length ? "Open" : "Start"}</span>
                      <CaretRight size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden md:flex fixed inset-0 z-[101] items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/40" onClick={() => setGuidedSheetOpen(false)} />
            <div
              className="relative w-full max-w-3xl rounded-[28px] bg-white shadow-2xl border border-[var(--kv-divider)] p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guided-help-title-desktop"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {guidedNodeStack.length > 0 && (
                    <button
                      onClick={() => setGuidedNodeStack((prev) => prev.slice(0, -1))}
                      className="w-10 h-10 rounded-full bg-[var(--kv-off-white)] flex items-center justify-center"
                    >
                      <CaretLeft size={18} />
                    </button>
                  )}
                  <div>
                    <h3 id="guided-help-title-desktop" className="text-[22px] font-bold text-[var(--kv-near-black)]">{sheetTitle}</h3>
                    <p className="text-[13px] text-[var(--kv-grey-mid)]">Select a category and I will continue the conversation one question at a time.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {currentSheetNodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      if (node.children?.length) {
                        setGuidedNodeStack((prev) => [...prev, node]);
                        return;
                      }
                      startFlow(
                        node.flowId,
                        node.initialAnswers,
                        [...guidedNodeStack.map((item) => item.label), node.label].join(" > "),
                      );
                    }}
                    className="text-left rounded-[22px] border border-[var(--kv-divider)] bg-[var(--kv-off-white)] p-4 hover:border-[var(--kv-green)] hover:bg-white transition-colors"
                  >
                    <div className="text-[26px] mb-2">{node.icon}</div>
                    <div className="text-[14px] font-semibold text-[var(--kv-near-black)]">{node.label}</div>
                    <div className="mt-2 text-[11px] text-[var(--kv-grey-mid)] flex items-center gap-1">
                      <span>{node.children?.length ? "Open" : "Start"}</span>
                      <CaretRight size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
