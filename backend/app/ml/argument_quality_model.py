from __future__ import annotations

import re
from pathlib import Path

import joblib

MODEL_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = MODEL_DIR / "argument_quality_model.joblib"

_TOKEN_RE = re.compile(r"[a-zA-Z]+(?:'[a-zA-Z]+)?")
_STRONG_MARKERS = {
    "because",
    "evidence",
    "study",
    "research",
    "data",
    "statistics",
    "therefore",
    "thus",
    "shows",
    "supports",
    "result",
    "improvement",
    "evidence-based",
    "measurable",
    "conclusion",
    "causal",
    "consistent",
}
_WEAK_MARKERS = {
    "everyone",
    "nobody",
    "always",
    "never",
    "vague",
    "unclear",
    "unsupported",
    "weak",
    "false",
    "just",
    "maybe",
    "kind of",
    "without",
    "emotion",
    "opinion",
    "irrelevant",
}


class ArgumentQualityModel:
    feature_names = (
        "bias",
        "length",
        "evidence",
        "reasoning",
        "specificity",
        "counterargument",
        "weak_language",
        "fallacy_language",
        "unsupported_universal",
    )

    def __init__(
        self,
        training_features: list[list[float]] | None = None,
        training_labels: list[float] | None = None,
    ):
        self.training_features = training_features or []
        self.training_labels = training_labels or []
        self.k = 5

    def fit(self, texts: list[str], labels: list[float]) -> "ArgumentQualityModel":
        self.training_features = [self._features(text) for text in texts]
        self.training_labels = list(labels)
        return self

    @staticmethod
    def _features(text: str) -> list[float]:
        lowered = text.lower()
        tokens = _TOKEN_RE.findall(lowered)
        count = len(tokens)
        evidence = sum(lowered.count(marker) for marker in ("because", "evidence", "study", "research", "data", "statistics", "percent", "according to"))
        reasoning = sum(lowered.count(marker) for marker in ("therefore", "thus", "which means", "as a result", "consequently", "so"))
        specificity = sum(character.isdigit() for character in text) + sum(
            lowered.count(marker) for marker in ("example", "measurable", "compare", "result", "source")
        )
        counterargument = sum(lowered.count(marker) for marker in ("however", "although", "opposing", "counter", "risk", "trade-off"))
        weak_language = sum(lowered.count(marker) for marker in ("maybe", "probably", "everyone", "nobody", "always", "never", "just", "opinion"))
        fallacy_language = sum(lowered.count(marker) for marker in ("idiot", "stupid", "ignore", "only two", "no other choice", "what about"))
        unsupported_universal = sum(lowered.count(marker) for marker in ("everyone", "nobody", "always", "never"))
        return [
            1.0,
            min(count, 45) / 45,
            min(evidence, 4) / 4,
            min(reasoning, 3) / 3,
            min(specificity, 5) / 5,
            min(counterargument, 3) / 3,
            min(weak_language, 3) / 3,
            min(fallacy_language, 3) / 3,
            min(unsupported_universal, 2) / 2,
        ]

    def predict_one(self, text: str) -> float:
        if not self.training_features:
            return 50.0
        features = self._features(text)
        distances = []
        for index, row in enumerate(self.training_features):
            distance = sum((left - right) ** 2 for left, right in zip(features, row, strict=True))
            if distance == 0:
                return self.training_labels[index]
            distances.append((distance, self.training_labels[index]))
        nearest = sorted(distances, key=lambda item: item[0])[: self.k]
        weighted_total = 0.0
        weight_total = 0.0
        for distance, label in nearest:
            weight = 1.0 / (distance + 0.01)
            weighted_total += weight * label
            weight_total += weight
        score = weighted_total / weight_total
        return max(0.0, min(100.0, score))

    def predict(self, texts: list[str]) -> list[float]:
        return [self.predict_one(text) for text in texts]


def _training_examples() -> tuple[list[str], list[float]]:
    strong_topics = ("education", "public health", "transport", "climate policy", "digital privacy")
    moderate_topics = ("school uniforms", "remote work", "public funding", "social media", "city planning")
    weak_topics = ("this rule", "that idea", "the proposal", "the change", "this issue")
    texts: list[str] = []
    labels: list[float] = []
    for topic in strong_topics:
        for percentage, outcome in ((18, "retention"), (24, "attendance"), (31, "completion")):
            texts.append(
                f"A comparative study found a {percentage} percent improvement in {outcome} for {topic}. "
                "Therefore, the policy has measurable support, although implementation risks should be monitored."
            )
            labels.append(90.0 + (percentage % 4))
        texts.append(
            f"The evidence for {topic} is credible because the results compare a baseline with the proposed approach. "
            "The causal reasoning is clear, and the strongest opposing risk can be addressed with regular evaluation."
        )
        labels.append(94.0)
    texts.extend(
        [
            "Because a comparative study found a 20 percent improvement, the policy has measurable support.",
            "Because the study provides evidence, the policy improves learning.",
            "The research provides evidence that the intervention improves outcomes, so the recommendation is justified.",
            "The data supports the claim because the result is measurable and the comparison includes a baseline.",
            "A specific example and a measured result support the claim, although implementation should still be evaluated.",
        ]
    )
    labels.extend((90.0, 88.0, 89.0, 91.0, 82.0))
    for topic in moderate_topics:
        texts.extend(
            [
                f"{topic} may improve outcomes because it could reduce costs, but the claim needs a comparison with alternatives.",
                f"I support {topic} in principle; however, the available evidence is mixed and the main trade-off needs further testing.",
                f"The proposal for {topic} has a plausible benefit, although the argument should explain who is affected and how success will be measured.",
                f"An example supports {topic}, but one example is not enough to establish a general conclusion.",
            ]
        )
        labels.extend((61.0, 58.0, 64.0, 52.0))
    texts.extend(
        [
            "The proposal may help, but we need data comparing costs and outcomes before deciding.",
            "The policy could be useful, but the argument needs evidence and a clear explanation of the trade-offs.",
            "I support the goal; however, the available evidence is limited and more testing is needed.",
            "This idea has a plausible benefit, but one example does not prove that it will work everywhere.",
        ]
    )
    labels.extend((62.0, 60.0, 59.0, 55.0))
    for topic in weak_topics:
        texts.extend(
            [
                f"Everyone knows {topic} is correct, so there is no need for evidence.",
                f"{topic} is obviously good because I say it is good.",
                f"Only two options exist: accept {topic} or allow everything to fail.",
                f"You are stupid, so your objection to {topic} is wrong.",
                f"What about another issue? That proves {topic} must be correct.",
            ]
        )
        labels.extend((18.0, 24.0, 16.0, 10.0, 22.0))
    return texts, labels


def train_model(path: Path | str = MODEL_PATH) -> dict:
    target_path = Path(path)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    texts, labels = _training_examples()
    model = ArgumentQualityModel().fit(texts, labels)
    payload = {
        "model": model,
        "metadata": {
            "version": "2.0",
            "training_samples": len(texts),
            "target": "argument_quality_score",
            "dataset": "balanced synthetic debate-quality examples",
            "features": list(ArgumentQualityModel.feature_names),
        },
    }
    joblib.dump(payload, target_path)
    return {"path": str(target_path), "training_samples": len(texts), "version": "2.0"}


def load_model(path: Path | str = MODEL_PATH):
    target_path = Path(path)
    if not target_path.exists():
        return None
    payload = joblib.load(target_path)
    if isinstance(payload, dict) and "model" in payload:
        return payload["model"]
    return payload


def predict_argument_quality(sentence: str) -> float | None:
    model = load_model()
    if model is None:
        return None
    prediction = float(model.predict_one(sentence))
    return max(0.0, min(100.0, prediction))


def predict_argument_quality_batch(sentences: list[str]) -> list[float]:
    model = load_model()
    if model is None:
        return []
    return [max(0.0, min(100.0, float(value))) for value in model.predict(sentences)]
