# KrishiVerse Phone QA Checklist

**URL:** `https://10.113.27.21:3000`
**Prerequisite:** Dev machine and phone on same Wi-Fi network. Accept the self-signed cert warning in the phone browser.

---

## Device Info

Fill in before testing begins.

| Field | Value |
|-------|-------|
| Phone model | |
| Android version | |
| Chrome version | |
| Available RAM | |

---

## Step (a) — Install as PWA

1. Open `https://10.113.27.21:3000` in Chrome on the phone.
2. Tap **Install app** / **Add to Home Screen** when prompted, or use Chrome menu > "Install app".
3. Confirm the KrishiVerse icon appears on the home screen.
4. Launch from home screen — app should open in standalone (no browser chrome).

| Result | Pass / Fail |
|--------|-------------|
| PWA installed and launches from home screen | |

---

## Step (b) — Enable airplane mode

1. Swipe down, enable **Airplane mode** (disable Wi-Fi + cellular).
2. Confirm the phone has no network connectivity (status bar shows airplane icon, no signal bars).
3. Leave airplane mode ON for the remainder of the checklist.

| Result | Pass / Fail |
|--------|-------------|
| Airplane mode enabled, no network | |

---

## Step (c) — On-device crop diagnosis (offline)

1. In the app, navigate to the **Diagnose** page.
2. Use a photo you already know the correct diagnosis for (e.g., a labeled PlantVillage test image, or a real photo you're confident about).
3. Submit for diagnosis.
4. Confirm a result is returned (disease name + treatment) **without any network request**.
5. If remotely debuggable (chrome://inspect), open the **Network** tab and verify **zero outgoing requests** during diagnosis.

| Result | Pass / Fail |
|--------|-------------|
| Diagnosis returned with result (no network) | |
| Returned diagnosis matches expected result | |
| Network tab shows zero requests | |

---

## Step (d) — Chatbot offline (WebGPU / Qwen2.5)

1. Navigate to the **Chat / Ask AI** page.
2. Type a question, e.g. "How do I treat tomato leaf curl?"
3. Confirm **WebGPU initializes** (no "WebGPU not supported" error).
4. Confirm **Qwen2.5 responds** with a meaningful answer — all while airplane mode is still on.

| Result | Pass / Fail / Not Supported on This Device |
|--------|-------------|
| WebGPU initialized without error | |
| Qwen2.5 responded offline | Pass / Fail / N/A |

*Note: "Not Supported on This Device" means WebGPU itself is unavailable (a hardware/browser compatibility gap, not a code bug), while "Fail" means WebGPU initialized but the chatbot still didn't work correctly (a real bug worth investigating).*

---

## Step (e) — IndexedDB persistence

1. Open DevTools (if remotely debuggable) > **Application** tab > **IndexedDB** > `KrishiVerse` (or similar store name).
2. Confirm the diagnosis record from Step (c) is present in the `diseaseDiagnoses` (or equivalent) store.
3. Confirm the chat messages from Step (d) are present in the `chatHistory` store.

| Result | Pass / Fail |
|--------|-------------|
| Diagnosis record persisted in IndexedDB | |
| Chat history persisted in IndexedDB | |

---

## Summary

| Step | Description | Result |
|------|-------------|--------|
| (a) | PWA install | |
| (b) | Airplane mode | |
| (c) | Offline diagnosis | |
| (d) | Offline chatbot (WebGPU) | |
| (e) | IndexedDB persistence | |

**Overall:** Pass / Fail
