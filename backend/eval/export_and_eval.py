# Re-export the trained EfficientNet-B0 checkpoint to ONNX and evaluate on the held-out
# eval images (20 per class, 120 total). Run with PYTHONIOENCODING=utf-8 to avoid cp1252 emoji crashes.
import json
import math
import os
import time
from pathlib import Path

import onnxruntime as ort
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0

CLASSES = [
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Pepper__bell___Bacterial_spot",
]
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)

HERE = Path(__file__).resolve().parent
CKPT = HERE / "models" / "efficientnet_b0_plantvillage.pt"
ONNX_PATH = HERE / "models" / "efficientnet_b0_plantvillage.onnx"
EVAL_ROOT = HERE / "dataset"


def build_model():
    model = efficientnet_b0(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(model.classifier[1].in_features, len(CLASSES)),
    )
    return model


def wilson_ci(k, n, z=1.96):
    """Wilson score confidence interval for a binomial proportion."""
    if n == 0:
        return (0.0, 1.0)
    p = k / n
    denom = 1 + z**2 / n
    centre = p + z**2 / (2 * n)
    margin = z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)
    lo = (centre - margin) / denom
    hi = (centre + margin) / denom
    return (max(0.0, lo), min(1.0, hi))


def main():
    ckpt = torch.load(CKPT, map_location="cpu")
    model = build_model()
    model.load_state_dict(ckpt["model"])
    model.eval()

    # ---- export ONNX (opset 18 supported by onnxruntime-web 1.27) ----
    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy,
        str(ONNX_PATH),
        input_names=["input"],
        output_names=["logits"],
        opset_version=18,
        dynamo=False,  # legacy TorchScript exporter: avoids onnxscript/ml_dtypes (numpy>=2), which conflict with scikit-learn's numpy<2 pin in the shared venv
    )
    print("exported", ONNX_PATH, f"({os.path.getsize(ONNX_PATH) / 1e6:.1f} MB)")

    labels_path = HERE / "models" / "labels.json"
    with open(labels_path, "w") as f:
        json.dump({"classes": CLASSES, "mean": list(MEAN), "std": list(STD), "input_size": 224}, f, indent=2)
    print("wrote", labels_path)

    # ---- evaluate on held-out eval images (120 total: 20/class x 6 classes) ----
    tf_eval = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    sess = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
    rows = []
    correct = total = 0
    for label, cls in enumerate(CLASSES):
        d = EVAL_ROOT / cls
        for f in sorted(d.glob("*.jpg")):
            img = Image.open(f).convert("RGB")
            t = tf_eval(img).unsqueeze(0).numpy()
            logits = sess.run(None, {"input": t})[0][0]
            pred = int(logits.argmax())
            total += 1
            if pred == label:
                correct += 1
            rows.append(
                {"class": cls, "file": f.name, "gt": label, "pred": pred, "pred_class": CLASSES[pred], "correct": pred == label}
            )
    acc = correct / total
    ci_lo, ci_hi = wilson_ci(correct, total)
    print(f"ONNX EVAL held-out: correct={correct}/{total} accuracy={acc:.4f} 95%Wilson=[{ci_lo:.4f},{ci_hi:.4f}]")
    with open(HERE / "models" / "onnx_eval_results.json", "w") as f:
        json.dump(
            {
                "runAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "model": ONNX_PATH.name,
                "correct": correct,
                "total": total,
                "accuracy": acc,
                "wilson_ci_95": [ci_lo, ci_hi],
                "rows": rows,
            },
            f,
            indent=2,
        )


if __name__ == "__main__":
    main()
