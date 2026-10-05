import { finalChatbotKB } from "../../data/chatbotKB";

let isReady = false;

export function initOfflineChatbot(statusCallback) {
  isReady = true;
  if (statusCallback) statusCallback("ready");
  console.log("[Offline AI] Keyword overlap algorithm initialized cleanly.");
}

export function getOfflineChatbotStatus() {
  return isReady;
}

export async function queryOfflineBot(question) {
  if (!isReady) {
    return "I'm still starting up my offline memory. Please try again.";
  }

  // --- Fast Local Keyword Overlap Search ---
  console.log(`[Offline bot] Attempting keyword overlap...`);
  const stopWords = new Set(["a", "an", "the", "in", "on", "at", "to", "for", "with", "about", "what", "is", "how", "do", "i", "can", "you", "my"]);
  const inputWords = question.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  if (inputWords.length > 0) {
    let bestKeywordMatch = null;
    let maxOverlap = 0;

    for (const item of finalChatbotKB) {
      const keywords = item.keywords.map(k => k.toLowerCase());
      let overlapCount = 0;
      for (const word of inputWords) {
        if (keywords.some(k => k.includes(word) || word.includes(k))) {
          overlapCount++;
        }
      }
      if (overlapCount > maxOverlap) {
        maxOverlap = overlapCount;
        bestKeywordMatch = item;
      }
    }

    if (bestKeywordMatch && maxOverlap >= 1) {
       console.log(`[Offline bot] Match success. Max overlap: ${maxOverlap}`);
       return bestKeywordMatch.answer;
    }
  }

  // --- Fallback: deterministic unknown-response selection ---
  // Same input always yields the same fallback (stable FNV-1a hash of the
  // query selects the variant, preserving variety across different queries
  // without Math.random()). Production output must be repeatable.
  const fallbacks = [
    "I'm still learning! Could you try phrasing that differently?",
    "I'm not quite sure I understand. Can you provide more details?",
    "Hmm, I don't have the answer to that right now. Connecting to the internet might help!",
    "I couldn't find a precise match for that offline. Please try rephrasing your question.",
    "Interesting question! Offline, I don't see a clear answer, but I'm constantly learning."
  ];

  return fallbacks[stablePick(question ?? "", fallbacks.length)];

  function stablePick(text, n) {
    let h = 0x811c9dc5;
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h % n;
  }
}
