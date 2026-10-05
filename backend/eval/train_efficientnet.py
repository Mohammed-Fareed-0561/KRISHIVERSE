# Fine-tune EfficientNet-B0 on expanded PlantVillage subsets (800/class).
# Changes from v1:
#   - RandomRotation(15) added to training augmentation (not eval)
#   - Unfreeze features.7 + features.8 (two blocks, not one) for fine-tuning
#   - Cosine annealing LR schedule for the fine-tuning stage (replaces fixed LR)
#   - Reports wall-clock training time
# CPU-only training.
import argparse
import json
import math
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

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


class ImageFolder(Dataset):
    def __init__(self, root, transform=None):
        self.items = []
        for label, cls in enumerate(CLASSES):
            d = Path(root) / cls
            for f in sorted(d.glob("*.jpg")):
                self.items.append((str(f), label))
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        p, label = self.items[i]
        img = Image.open(p).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


def train(args):
    torch.manual_seed(42)
    tf_train = transforms.Compose(
        [
            transforms.RandomResizedCrop(224, scale=(0.6, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )
    tf_eval = transforms.Compose(
        [
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ]
    )

    ds = ImageFolder(args.data_dir, tf_train)
    train_ds, val_ds = torch.utils.data.random_split(ds, [int(0.85 * len(ds)), len(ds) - int(0.85 * len(ds))])
    print(f"train={len(train_ds)} val={len(val_ds)} total={len(ds)}")

    model = efficientnet_b0(weights=EfficientNet_B0_Weights.IMAGENET1K_V1)
    for p in model.parameters():
        p.requires_grad = False
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(model.classifier[1].in_features, len(CLASSES)),
    )
    opt = torch.optim.Adam(model.classifier.parameters(), lr=1e-3, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=args.epochs)
    loss_fn = nn.CrossEntropyLoss()

    dl = DataLoader(train_ds, batch_size=args.batch, shuffle=True, num_workers=0)
    val_dl = DataLoader(val_ds, batch_size=args.batch, shuffle=False, num_workers=0)

    wall_start = time.time()
    print(f"Training start: {time.strftime('%H:%M:%S')}")

    model.train()
    for epoch in range(args.epochs):
        t0 = time.time()
        total = correct = 0
        for x, y in dl:
            opt.zero_grad()
            out = model(x)
            loss = loss_fn(out, y)
            loss.backward()
            opt.step()
            correct += (out.argmax(1) == y).sum().item()
            total += y.size(0)
        sched.step()
        acc = correct / total
        vacc = self_eval(model, val_dl)
        print(f"epoch {epoch + 1}/{args.epochs} loss={loss.item():.4f} train_acc={acc:.4f} val_acc={vacc:.4f} ({time.time() - t0:.0f}s)")

    # Unfreeze features.7 + features.8 + classifier (two backbone blocks, not one)
    if args.unfreeze_epochs > 0:
        for name, p in model.named_parameters():
            if "features.7" in name or "features.8" in name or "classifier" in name:
                p.requires_grad = True
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        print(f"Unfrozen params: {trainable:,}")

        opt2 = torch.optim.Adam([p for p in model.parameters() if p.requires_grad], lr=5e-5, weight_decay=1e-4)
        sched2 = torch.optim.lr_scheduler.CosineAnnealingLR(opt2, T_max=args.unfreeze_epochs)

        for epoch in range(args.unfreeze_epochs):
            t0 = time.time()
            total = correct = 0
            for x, y in dl:
                opt2.zero_grad()
                out = model(x)
                loss = loss_fn(out, y)
                loss.backward()
                opt2.step()
                correct += (out.argmax(1) == y).sum().item()
                total += y.size(0)
            sched2.step()
            vacc = self_eval(model, val_dl)
            print(f"ft epoch {epoch + 1}/{args.unfreeze_epochs} loss={loss.item():.4f} train_acc={correct / total:.4f} val_acc={vacc:.4f} ({time.time() - t0:.0f}s)")

    wall_total = time.time() - wall_start
    print(f"\n=== WALL-CLOCK TRAINING TIME: {wall_total:.0f}s ({wall_total / 60:.1f} min) ===")

    model.eval()

    # ---- save checkpoint ----
    os.makedirs(args.out_dir, exist_ok=True)
    ckpt = os.path.join(args.out_dir, "efficientnet_b0_plantvillage.pt")
    torch.save({"model": model.state_dict(), "classes": CLASSES}, ckpt)
    print("saved checkpoint", ckpt)

    # ---- export ONNX ----
    onnx_path = os.path.join(args.out_dir, "efficientnet_b0_plantvillage.onnx")
    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model, dummy, onnx_path,
        input_names=["input"], output_names=["logits"],
        opset_version=17,
        dynamo=False,
    )
    labels_path = os.path.join(args.out_dir, "labels.json")
    with open(labels_path, "w") as f:
        json.dump({"classes": CLASSES, "mean": list(MEAN), "std": list(STD), "input_size": 224}, f, indent=2)
    print("exported", onnx_path, f"({os.path.getsize(onnx_path) / 1e6:.1f} MB)", "and", labels_path)

    # ---- evaluate ONNX on eval set ----
    import math as _math
    import onnxruntime as ort

    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    eval_root = args.eval_dir
    rows = []
    correct = total = 0
    for label, cls in enumerate(CLASSES):
        d = Path(eval_root) / cls
        for f in sorted(d.glob("*.jpg")):
            img = Image.open(f).convert("RGB")
            t = tf_eval(img).unsqueeze(0).numpy()
            logits = sess.run(None, {"input": t})[0][0]
            pred = int(logits.argmax())
            total += 1
            if pred == label:
                correct += 1
            rows.append({"class": cls, "file": f.name, "gt": label, "pred": pred, "pred_class": CLASSES[pred], "correct": pred == label})
    acc = correct / total

    # Wilson score CI
    z = 1.96
    p_hat = correct / total
    denom = 1 + z**2 / total
    centre = p_hat + z**2 / (2 * total)
    margin = z * _math.sqrt((p_hat * (1 - p_hat) + z**2 / (4 * total)) / total)
    ci_lo = max(0.0, (centre - margin) / denom)
    ci_hi = min(1.0, (centre + margin) / denom)

    print(f"\n=== ONNX EVAL ===  correct={correct}/{total} accuracy={acc:.4f} 95%Wilson=[{ci_lo:.4f},{ci_hi:.4f}]")

    # Per-class breakdown
    print("\n=== PER-CLASS BREAKDOWN ===")
    for label, cls in enumerate(CLASSES):
        cls_rows = [r for r in rows if r["gt"] == label]
        cls_correct = sum(1 for r in cls_rows if r["correct"])
        print(f"  {cls}: {cls_correct}/{len(cls_rows)}")

    # Write results
    with open(os.path.join(args.out_dir, "onnx_eval_results.json"), "w") as f:
        json.dump({
            "runAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "model": "efficientnet_b0_plantvillage.onnx",
            "correct": correct,
            "total": total,
            "accuracy": acc,
            "wilson_ci_95": [ci_lo, ci_hi],
            "wallClockSeconds": wall_total,
            "rows": rows,
        }, f, indent=2)

    print(f"\nWall-clock time: {wall_total:.0f}s ({wall_total / 60:.1f} min)")
    return acc


def self_eval(model, val_dl):
    model.eval()
    with torch.no_grad():
        correct = total = 0
        for x, y in val_dl:
            out = model(x)
            correct += (out.argmax(1) == y).sum().item()
            total += y.size(0)
    model.train()
    return correct / total


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir", default=os.path.join(os.path.dirname(__file__), "train_data_v2"))
    ap.add_argument("--eval-dir", default=os.path.join(os.path.dirname(__file__), "dataset"))
    ap.add_argument("--out-dir", default=os.path.join(os.path.dirname(__file__), "models"))
    ap.add_argument("--epochs", type=int, default=10, help="frozen-backbone training epochs")
    ap.add_argument("--unfreeze-epochs", type=int, default=3, help="fine-tuning epochs with unfrozen blocks")
    ap.add_argument("--batch", type=int, default=32)
    args = ap.parse_args()
    train(args)
