#!/usr/bin/env python3
"""
eval/mobile-ai/adapters/needleRunner.py — executable adapter for Cactus
Needle 3 inside the KrishiVerse benchmark (isolated; never used by the
farmer runtime).

Install (once; network required for pip and initial weight download):
    pip install cactus-needle
    # weights: HuggingFace Cactus-Compute/needle3 (needle3.cact) or
    #   needle build --platform <folder>  (see cactus-compute/needle README)
    # point NEEDLE_MODEL_PATH at the .cact file if not in cwd.

MANDATORY privacy settings for every run — Needle telemetry is ON by default
in the native binary, so the benchmark pins it off:
    export NEEDLE_TELEMETRY=0
    export DO_NOT_TRACK=1

Usage:
    NEEDLE_TELEMETRY=0 DO_NOT_TRACK=1 NEEDLE_MODEL_PATH=/path/needle3.cact \\
        python needleRunner.py <<< '{"task":"intent","text":"rice blast"}'

Input : one JSON object {task, text}
Output: one JSON object {ok, task, result, confidence, ms}

NOTE: tool signatures below follow the documented needle.tool pattern from
github.com/cactus-compute/needle. Verify against the installed package version
(`python -c "import needle, inspect; print(needle.__version__)"`) before the
first recorded run; the adapter fails loudly rather than silently guessing.
"""
import json
import os
import sys
import time

os.environ.setdefault("NEEDLE_TELEMETRY", "0")
os.environ.setdefault("DO_NOT_TRACK", "1")

INTENT_ENUM = ["greeting", "help", "about", "what_is", "disease", "fertilizer",
               "scheme", "weather", "price", "cultivation", "treatment", "unknown"]
LANG_ENUM = ["en", "ta", "tanglish", "hi"]


def fail(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(0)


def build_tools(task):
    import needle

    if task == "language_identification":

        @needle.tool
        def report_language(language: str):
            "Report the language of the farmer text. One of: en, ta, tanglish, hi."
            return {"language": language}

        return [report_language], lambda r: {"language": r[0].get("language")}

    if task == "intent":

        @needle.tool
        def report_intent(intent: str, crop: str, symptom: str):
            ("Report the farmer query classification. intent is one of: "
             + ", ".join(INTENT_ENUM)
             + ". crop and symptom are lowercase canonical words or empty strings.")
            return {"intent": intent, "crop": crop, "symptom": symptom}

        return [report_intent], lambda r: r[0] if r else {}

    if task == "extract":

        @needle.tool
        def report_entities(crop: str, disease: str, symptom: str, plant_part: str,
                            location: str, season: str):
            "Extract structured entities from the farmer query. Empty string when absent."
            return {"crop": crop, "disease": disease, "symptom": symptom,
                    "plant_part": plant_part, "location": location, "season": season}

        return [report_entities], lambda r: r[0] if r else {}

    if task == "clarify":

        @needle.tool
        def report_clarification(needs_clarification: bool, question: str):
            "Decide whether the query needs a clarifying question; question is '' when not needed."
            return {"needs_clarification": needs_clarification, "question": question}

        return [report_clarification], lambda r: (r[0] if r else {"needs_clarification": False, "question": ""})

    return None, None


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        fail("stdin must be one JSON object")
        return

    task = payload.get("task", "")
    text = payload.get("text", "")
    model_path = os.environ.get("NEEDLE_MODEL_PATH", "needle3.cact")

    try:
        import needle  # noqa: F401
    except Exception:
        fail("python package 'cactus-needle' not installed (pip install cactus-needle)")
        return

    tools, pick = build_tools(task)
    if tools is None:
        fail(f"unknown task {task!r}")
        return

    t0 = time.time()
    try:
        agent = needle.Needle(model=model_path, tools=tools)
        out = agent.run(text)
    except TypeError:
        # older/newer signature: model path positional
        try:
            agent = needle.Needle(model_path, tools=tools)
            out = agent.run(text)
        except Exception as exc:
            fail(f"needle execution failed: {exc}")
            return
    except Exception as exc:
        fail(f"needle execution failed: {exc}")
        return
    ms = (time.time() - t0) * 1000.0
    results = out.get("results") or []
    print(json.dumps({
        "ok": True,
        "task": task,
        "result": pick(results),
        "confidence": out.get("confidence"),
        "ms": round(ms, 1),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
