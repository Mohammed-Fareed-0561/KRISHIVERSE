import { describe, it, expect } from "vitest";
import {
  buildLocalChatMessages,
  isWebGpuSupported,
  isOnDeviceEnabled,
  getOnDeviceModelId,
  ONDEVICE_MODEL_ID,
} from "./onDeviceChatEngine";

describe("onDeviceChatEngine", () => {
  it("defaults to enabled when VITE_ENABLE_ONDEVICE_LLM is unset", () => {
    expect(isOnDeviceEnabled()).toBe(true);
  });

  it("builds bilingual system prompt with rules", () => {
    const msgs = buildLocalChatMessages({
      question: "How to treat tomato blight?",
      context: "tomato, Tamil Nadu",
      language: "en",
      localKnowledge: "Local: use neem oil",
    });
    expect(msgs.length).toBe(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("KrishiVerse");
    expect(msgs[1].role).toBe("user");
    const payload = JSON.parse(msgs[1].content);
    expect(payload.question).toContain("tomato blight");
    expect(payload.localKnowledge).toContain("neem oil");
  });

  it("uses Tamil instruction for ta language", () => {
    const msgs = buildLocalChatMessages({ question: "q", language: "ta", context: {} });
    expect(msgs[0].content).toContain("Tamil");
  });

  it("reports WebGPU support from the runtime", () => {
    // jsdom has no navigator.gpu -> should be false
    expect(isWebGpuSupported()).toBe(false);
  });

  it("defaults to the Qwen2.5-3B model id", () => {
    expect(ONDEVICE_MODEL_ID).toContain("Qwen2.5-3B");
  });

  it("selects a smaller model tier for low-memory devices", () => {
    expect(getOnDeviceModelId(2)).toContain("Qwen2.5-0.5B");
    expect(getOnDeviceModelId(6)).toContain("Qwen2.5-1.5B");
    expect(getOnDeviceModelId(12)).toContain("Qwen2.5-3B");
    expect(getOnDeviceModelId(undefined)).toContain("Qwen2.5-3B");
  });
});