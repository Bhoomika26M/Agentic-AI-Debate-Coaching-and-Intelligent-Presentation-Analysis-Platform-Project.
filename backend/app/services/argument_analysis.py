"""
Argument Analysis & Logical Fallacy Detection Engine
Implements Milestone 2 specification:
- Argument Extraction (Claims, Premises, Evidence, Conclusions)
- Logical Fallacy Detection across all 8 supported fallacies:
    1. Ad Hominem
    2. Straw Man
    3. False Dilemma
    4. Slippery Slope
    5. Appeal to Authority
    6. Circular Reasoning
    7. Hasty Generalization
    8. Red Herring
- Reasoning Quality Analysis & Evaluation Criteria (Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness)
- Weighted Performance Scoring Model (30% Argument Quality, 20% Evidence Usage, 20% Logical Consistency, 15% Rebuttal Effectiveness, 15% Communication Skills)
- Automated Feedback Report Generation
"""

import re
from app.schemas.analysis import (
    FallacyItem,
    ExtractedArgument,
    EvaluationCriteria,
    WeightedScoreBreakdown,
    AnalysisReportResponse,
    FallacyDefinition,
)

# ── Knowledge Base: 8 Supported Logical Fallacies ─────────────────────────────

SUPPORTED_FALLACIES: list[FallacyDefinition] = [
    FallacyDefinition(
        name="Ad Hominem",
        category="Relevance / Personal Attack",
        description="Attacking an opponent's character, motive, or personal traits rather than addressing the substance of their argument.",
        example="My opponent argues for tax reform, but he is a corrupt liar who cannot be trusted.",
        correction="Refute the opponent's data, economic models, or reasoning directly instead of attacking their character."
    ),
    FallacyDefinition(
        name="Straw Man",
        category="Misrepresentation",
        description="Caricaturing, exaggerating, or misrepresenting an opponent's argument to make it easier to attack.",
        example="Proponents of green energy basically want us to abandon modern technology and live in caves.",
        correction="Represent the opponent's position in its strongest, most accurate form before challenging it."
    ),
    FallacyDefinition(
        name="False Dilemma",
        category="Presumption / Black-and-White",
        description="Presenting a nuanced issue as an absolute either/or dichotomy while ignoring reasonable middle grounds.",
        example="Either we completely ban artificial intelligence, or human society is doomed.",
        correction="Acknowledge the continuum of options, such as targeted regulation and safety audits."
    ),
    FallacyDefinition(
        name="Slippery Slope",
        category="Causal Reasoning",
        description="Arguing without causal justification that an initial small action will inevitably trigger a sequence of catastrophic consequences.",
        example="If we permit this minor curfew revision, young people will lose all discipline and civilization will collapse.",
        correction="Provide empirical evidence or causal mechanisms for each step in the alleged chain of events."
    ),
    FallacyDefinition(
        name="Appeal to Authority",
        category="Defective Evidence",
        description="Claiming a premise must be true purely because a famous person or irrelevant authority endorses it, lacking empirical backing.",
        example="A famous Hollywood celebrity said this diet cures all diseases, so it must be medically true.",
        correction="Cite peer-reviewed scientific studies, clinical trials, or domain-relevant consensus rather than fame."
    ),
    FallacyDefinition(
        name="Circular Reasoning",
        category="Structural Begging the Question",
        description="Using the conclusion itself as the primary justification or premise, creating a circular loop with no external support.",
        example="We must obey the law because breaking the law is illegal.",
        correction="Offer independent ethical, social, or empirical justifications external to the conclusion itself."
    ),
    FallacyDefinition(
        name="Hasty Generalization",
        category="Inductive Flaw / Unrepresentative Sample",
        description="Drawing a sweeping universal conclusion from an isolated anecdotal instance or tiny unrepresentative sample.",
        example="I tried remote work for two days and didn't like it; therefore, remote work is ineffective for all companies.",
        correction="Rely on comprehensive statistical samples and controlled studies rather than personal anecdotes."
    ),
    FallacyDefinition(
        name="Red Herring",
        category="Relevance / Distraction",
        description="Introducing an irrelevant topic or emotional distraction to derail attention away from the core debate motion.",
        example="Why are we debating education funding when national defense should be our only concern?",
        correction="Maintain strict thematic relevance to the motion under debate before redirecting to secondary topics."
    ),
]


# ── Detection Patterns & Heuristics ───────────────────────────────────────────

FALLACY_RULES = [
    {
        "type": "Ad Hominem",
        "patterns": [
            r"\b(?:my opponent|he|she|they|you) (?:is|are) (?:a liar|corrupt|foolish|stupid|ignorant|incompetent|naive|hypocritical|a fraud|dishonest)\b",
            r"\b(?:you are|he is|she is) just (?:an idiot|a fool|uneducated|clueless|pathetic)\b",
            r"\b(?:don'?t listen to (?:him|her|them)|can'?t trust (?:him|her|them)) because (?:he|she|they) (?:is|are)\b",
            r"\bonly a fool would believe\b",
            r"\b(?:my opponent'?s? character|personal flaws?|corrupt nature)\b",
        ],
        "explanation": "This statement attacks the speaker's personal character or intelligence instead of disproving the validity of their claims.",
        "correction": "Refocus the argument on empirical facts, counter-evidence, and logical deduction rather than the opponent's persona.",
        "severity": "high",
        "credibility_impact": "High reduction in ethos and judge credibility.",
    },
    {
        "type": "Straw Man",
        "patterns": [
            r"\b(?:my opponent|the other side|proponents) (?:basically )?want(?:s)? to (?:destroy|eliminate|abolish|ruin) (?:all|everything|our entire)\b",
            r"\b(?:they|my opponents?) (?:claim|think|believe) that we should (?:just do nothing|give up|live in caves|let everyone die)\b",
            r"\bso (?:you'?re saying|they think) that (?:all|no one|nothing matter)\b",
            r"\bwant(?:s)? us to abandon all (?:reason|technology|laws|morals)\b",
        ],
        "explanation": "This statement caricatures or exaggerates the opposing position into an extreme, undefendable version.",
        "correction": "Accurately state the opponent's nuanced stance and debate their actual proposal rather than an exaggerated caricature.",
        "severity": "high",
        "credibility_impact": "Diminishes constructive debate and loses points with adjudication panels.",
    },
    {
        "type": "False Dilemma",
        "patterns": [
            r"\beither we\b.+\bor (?:we will|humanity will|society will|we are doomed|face complete ruin)\b",
            r"\b(?:there are only two choices|only two options|it'?s either .+ or .+)\b",
            r"\beither you are with (?:us|this) or you are against\b",
            r"\bif we don'?t .+ (?:everything will fall apart|we have no future)\b",
        ],
        "explanation": "This statement presents a false binary choice, ignoring moderate solutions or alternative policy compromises.",
        "correction": "Introduce intermediate policy options, incremental reforms, or conditional frameworks instead of all-or-nothing framing.",
        "severity": "medium",
        "credibility_impact": "Exposes oversimplification of complex socio-economic realities.",
    },
    {
        "type": "Slippery Slope",
        "patterns": [
            r"\bif we (?:allow|permit|give in to) .+ (?:it will inevitably lead to|will result in|before we know it|next thing you know)\b",
            r"\bwill inevitably (?:cause|destroy|lead to disaster|end in chaos|result in)\b",
            r"\bonce we start .+, (?:there is no stopping|we will end up)\b",
            r"\ba slippery slope to (?:totalitarianism|ruin|chaos|extinction)\b",
        ],
        "explanation": "This statement assumes an inevitable chain reaction leading to extreme disaster without demonstrating causal links.",
        "correction": "Demonstrate each step of causality with verifiable mechanisms and statistical precedents instead of claiming inevitable disaster.",
        "severity": "high",
        "credibility_impact": "Weakens argumentation due to unproven causal leaps.",
    },
    {
        "type": "Appeal to Authority",
        "patterns": [
            r"\b(?:a famous \w+|the celebrity|a celebrity|an actor|my favorite influencer|celebrity \w+) (?:said|claims?|stated) (?:that)?\b",
            r"\b(?:everyone knows that|all smart people agree that)\b",
            r"\bbecause .+ (?:is famous|is wealthy|has millions of followers)\b",
            r"\btrust me because (?:an authority|a celebrity) says so\b",
        ],
        "explanation": "This statement cites celebrity status or prestige instead of verifiable empirical evidence or peer-reviewed domain data.",
        "correction": "Cite peer-reviewed scientific studies, qualified domain specialists, or empirical datasets.",
        "severity": "medium",
        "credibility_impact": "Makes arguments vulnerable to crossfire scrutiny.",
    },
    {
        "type": "Circular Reasoning",
        "patterns": [
            r"\bwe must (?:obey|follow) .+ because (?:breaking (?:it|the \w+) is illegal|it is illegal|it is forbidden|it is required)\b",
            r"\b(?:because it is|since it is) (?:a fact|true|obvious|what it is|the truth)\b",
            r"\bis (?:right|true) because it is (?:correct|right|true)\b",
            r"\bis effective because it works\b",
            r"\b(?:he|she|they) (?:is|are) telling the truth because (?:he|she|they) (?:would never lie|is honest)\b",
        ],
        "explanation": "The premise assumes the truth of the conclusion it aims to establish, generating a circular justification.",
        "correction": "Provide external supporting evidence and independent warrants that do not presuppose the conclusion.",
        "severity": "medium",
        "credibility_impact": "Fails the fundamental test of deductive validity.",
    },
    {
        "type": "Hasty Generalization",
        "patterns": [
            r"\b(?:i know one person who|my friend had|in one case|i once saw|one person) .+, (?:so all|therefore every|which proves all|so every)\b",
            r"\b(?:all of them|every single one|everyone) (?:always|never) .+ because (?:one|once)\b",
            r"\bthis single example proves (?:that all|the entire)\b",
            r"\beveryone in that country is .+ based on my visit\b",
            r"\b(?:one|a single) (?:person|case|example) .+, (?:so all|therefore all|proves all)\b",
        ],
        "explanation": "This draws a sweeping, universal generalization from an anecdotal or statistically insufficient sample.",
        "correction": "Cite randomized controlled trials, aggregate statistical surveys, or large cohort studies to substantiate broad claims.",
        "severity": "medium",
        "credibility_impact": "Easily rebutted by citing counterexamples or statistical evidence.",
    },
    {
        "type": "Red Herring",
        "patterns": [
            r"\bwhy (?:are we talking about|focus on) .+ when (?:what about|look at)\b",
            r"\bwhat about (?:the other issue|what happened last year|the space program)\b",
            r"\bforget about .+ (?:the real issue is|look over there)\b",
            r"\bthat may be (?:true|so), but what about\b",
            r"\b(?:besides|furthermore),? why are we talking about .+ when\b",
        ],
        "explanation": "This statement introduces a diverting tangent or irrelevant topic to shift focus away from the motion.",
        "correction": "Directly address the primary resolution or point under consideration before pivoting to ancillary matters.",
        "severity": "medium",
        "credibility_impact": "Perceived as evasive during formal debate rounds.",
    },
]


# ── Core Analysis Engine Class ────────────────────────────────────────────────

class ArgumentAnalysisEngine:
    """
    Production-grade Engine for Argument Mining, Fallacy Detection,
    Reasoning Quality Assessment, and Weighted Scoring.
    """

    def analyze(
        self,
        text: str,
        topic: str | None = None,
        position: str | None = None,
        context: str | None = None,
    ) -> AnalysisReportResponse:
        cleaned_text = text.strip()
        words = re.findall(r"\b\w+\b", cleaned_text)
        word_count = len(words)
        char_count = len(cleaned_text)

        # 1. Fallacy Detection
        detected_fallacies = self._detect_fallacies(cleaned_text)

        # 2. Argument Extraction
        extracted_arguments = self._extract_arguments(cleaned_text, topic, position)

        # 3. Evaluation Criteria (Clarity, Relevance, Evidence Strength, Logical Consistency, Persuasiveness)
        eval_criteria = self._calculate_evaluation_criteria(
            cleaned_text, topic, word_count, detected_fallacies, extracted_arguments
        )

        # 4. Weighted Scoring Model (30% AQ, 20% EU, 20% LC, 15% RE, 15% CS)
        weighted_scores = self._calculate_weighted_scores(
            eval_criteria, detected_fallacies, extracted_arguments, word_count
        )

        overall_score = weighted_scores.overall_score
        grade = self._assign_grade(overall_score)

        # 5. Feedback & Coaching Report
        executive_summary = self._generate_executive_summary(
            overall_score, grade, detected_fallacies, extracted_arguments
        )
        strengths = self._identify_strengths(eval_criteria, extracted_arguments, detected_fallacies)
        improvements = self._identify_improvements(detected_fallacies, eval_criteria, word_count)
        recommendations = self._generate_recommendations(detected_fallacies, eval_criteria, extracted_arguments)

        return AnalysisReportResponse(
            topic=topic,
            position=position,
            word_count=word_count,
            char_count=char_count,
            overall_score=overall_score,
            grade=grade,
            weighted_scores=weighted_scores,
            evaluation_criteria=eval_criteria,
            fallacies=detected_fallacies,
            arguments=extracted_arguments,
            executive_summary=executive_summary,
            key_strengths=strengths,
            areas_for_improvement=improvements,
            actionable_recommendations=recommendations,
        )

    def _split_into_sentences(self, text: str) -> list[str]:
        raw = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in raw if len(s.strip()) > 3]

    def _detect_fallacies(self, text: str) -> list[FallacyItem]:
        fallacies: list[FallacyItem] = []
        sentences = self._split_into_sentences(text)
        seen_quotes = set()

        for rule in FALLACY_RULES:
            f_type = rule["type"]
            matched_for_rule = False
            for sentence in sentences:
                for pattern in rule["patterns"]:
                    match = re.search(pattern, sentence, re.IGNORECASE)
                    if match:
                        quote = sentence.strip()
                        if quote not in seen_quotes:
                            seen_quotes.add(quote)
                            fallacies.append(
                                FallacyItem(
                                    fallacy_type=f_type,
                                    quote=quote,
                                    explanation=rule["explanation"],
                                    correction_suggestion=rule["correction"],
                                    severity=rule["severity"],
                                    credibility_impact=rule["credibility_impact"],
                                )
                            )
                        matched_for_rule = True
                        break
                if matched_for_rule:
                    break

            # Fallback scan across entire text block if not captured in individual sentences
            if not matched_for_rule:
                for pattern in rule["patterns"]:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        snippet = match.group(0).strip()
                        if snippet not in seen_quotes:
                            seen_quotes.add(snippet)
                            fallacies.append(
                                FallacyItem(
                                    fallacy_type=f_type,
                                    quote=snippet,
                                    explanation=rule["explanation"],
                                    correction_suggestion=rule["correction"],
                                    severity=rule["severity"],
                                    credibility_impact=rule["credibility_impact"],
                                )
                            )
                        break

        return fallacies

    def _extract_arguments(
        self, text: str, topic: str | None, position: str | None
    ) -> ExtractedArgument:
        sentences = self._split_into_sentences(text)
        if not sentences:
            return ExtractedArgument(central_claim="No articulate claim detected.")

        central_claim = sentences[0]
        claim_type = "value"
        lower_text = text.lower()

        if any(w in lower_text for w in ["policy", "government should", "must enact", "legislation", "prohibit"]):
            claim_type = "policy"
        elif any(w in lower_text for w in ["statistically", "data shows", "fact is", "evidence proves", "who reports"]):
            claim_type = "factual"
        elif any(w in lower_text for w in ["causes", "leads to", "triggers", "results in"]):
            claim_type = "causal"

        premise_markers = ["because", "since", "furthermore", "firstly", "secondly", "moreover", "given that", "in addition"]
        conclusion_markers = ["therefore", "thus", "consequently", "in conclusion", "it follows that", "ultimately"]
        evidence_markers = [
            "for example", "studies show", "according to", "percent", "%", "research", "data", "cited",
            "agency", "oecd", "who", "report", "statistics", "demonstrate"
        ]

        premises = []
        conclusions = []
        evidence_points = []

        for s in sentences:
            s_lower = s.lower()
            if any(m in s_lower for m in premise_markers):
                premises.append(s)
            if any(m in s_lower for m in conclusion_markers):
                conclusions.append(s)
            if any(m in s_lower for m in evidence_markers) or re.search(r"\b\d+(?:\.\d+)?%?\b", s):
                evidence_points.append(s)

        if not premises and len(sentences) > 1:
            premises = sentences[1:min(4, len(sentences))]
        if not conclusions and len(sentences) > 2:
            conclusions = [sentences[-1]]

        evidence_rating = "weak"
        if len(evidence_points) >= 2 or any(re.search(r"\d+%", ep) for ep in evidence_points):
            evidence_rating = "strong"
        elif len(evidence_points) == 1:
            evidence_rating = "moderate"

        return ExtractedArgument(
            central_claim=central_claim,
            claim_type=claim_type,
            premises=premises[:4],
            evidence_points=evidence_points[:4],
            evidence_strength_rating=evidence_rating,
            conclusions=conclusions[:2],
        )

    def _calculate_evaluation_criteria(
        self,
        text: str,
        topic: str | None,
        word_count: int,
        fallacies: list[FallacyItem],
        arguments: ExtractedArgument,
    ) -> EvaluationCriteria:
        sentences = self._split_into_sentences(text)
        num_sentences = max(1, len(sentences))
        avg_sentence_len = word_count / num_sentences

        # 1. Clarity (Base 84, scaled with sentence structure)
        clarity = 84.0
        if word_count < 25:
            clarity -= 15.0
        elif word_count >= 40:
            clarity += 4.0

        if avg_sentence_len > 35:
            clarity -= (avg_sentence_len - 35) * 0.8
        clarity = max(40.0, min(96.0, clarity))

        # 2. Relevance (Base 85, boosted by topic alignment, penalized by Red Herring)
        relevance = 85.0
        if topic:
            topic_words = set(re.findall(r"\b\w{4,}\b", topic.lower()))
            text_words = set(re.findall(r"\b\w{4,}\b", text.lower()))
            overlap = topic_words.intersection(text_words)
            if overlap:
                relevance = min(96.0, 84.0 + (len(overlap) * 4.0))
        if any(f.fallacy_type == "Red Herring" for f in fallacies):
            relevance -= 25.0
        relevance = max(25.0, min(98.0, relevance))

        # 3. Evidence Strength
        if arguments.evidence_strength_rating == "strong":
            evidence_score = 90.0
        elif arguments.evidence_strength_rating == "moderate":
            evidence_score = 78.0
        else:
            evidence_score = 52.0

        # 4. Logical Consistency (Base 92, deducted per detected fallacy)
        fallacy_deduction = 0.0
        for f in fallacies:
            if f.severity == "high":
                fallacy_deduction += 16.0
            elif f.severity == "medium":
                fallacy_deduction += 9.0
            else:
                fallacy_deduction += 5.0
        logical_consistency = max(20.0, 92.0 - fallacy_deduction)

        # 5. Persuasiveness (Synthesized composite of clarity, relevance, evidence, and logic)
        persuasiveness = (
            (clarity * 0.25)
            + (relevance * 0.25)
            + (evidence_score * 0.25)
            + (logical_consistency * 0.25)
        )
        if len(fallacies) == 0:
            persuasiveness += 3.0
        persuasiveness = max(20.0, min(98.0, persuasiveness))

        return EvaluationCriteria(
            clarity=round(clarity, 1),
            relevance=round(relevance, 1),
            evidence_strength=round(evidence_score, 1),
            logical_consistency=round(logical_consistency, 1),
            persuasiveness=round(persuasiveness, 1),
        )

    def _calculate_weighted_scores(
        self,
        criteria: EvaluationCriteria,
        fallacies: list[FallacyItem],
        arguments: ExtractedArgument,
        word_count: int,
    ) -> WeightedScoreBreakdown:
        # Argument Quality: 30% weight
        arg_quality = round((criteria.clarity * 0.45) + (criteria.persuasiveness * 0.55), 1)

        # Evidence Usage: 20% weight
        evidence_usage = round(criteria.evidence_strength, 1)

        # Logical Consistency: 20% weight
        logical_consistency = round(criteria.logical_consistency, 1)

        # Rebuttal Effectiveness: 15% weight
        rebuttal_effectiveness = round(
            min(96.0, max(30.0, (criteria.relevance * 0.55) + (criteria.persuasiveness * 0.45) - (len(fallacies) * 5))),
            1
        )

        # Communication Skills: 15% weight
        comm_skills = round(min(98.0, max(35.0, (criteria.clarity * 0.65) + (criteria.persuasiveness * 0.35))), 1)

        # Overall Weighted Debate Performance Score:
        overall = (
            (arg_quality * 0.30)
            + (evidence_usage * 0.20)
            + (logical_consistency * 0.20)
            + (rebuttal_effectiveness * 0.15)
            + (comm_skills * 0.15)
        )
        overall_clamped = round(max(10.0, min(100.0, overall)), 1)

        return WeightedScoreBreakdown(
            argument_quality=arg_quality,
            evidence_usage=evidence_usage,
            logical_consistency=logical_consistency,
            rebuttal_effectiveness=rebuttal_effectiveness,
            communication_skills=comm_skills,
            overall_score=overall_clamped,
        )

    def _assign_grade(self, score: float) -> str:
        if score >= 88.0:
            return "Elite Master Debater"
        if score >= 78.0:
            return "Proficient Competitor"
        if score >= 68.0:
            return "Competent Speaker"
        if score >= 55.0:
            return "Developing Debater"
        return "Novice Speaker"

    def _generate_executive_summary(
        self,
        overall_score: float,
        grade: str,
        fallacies: list[FallacyItem],
        arguments: ExtractedArgument,
    ) -> str:
        if len(fallacies) == 0:
            return (
                f"Outstanding presentation achieved a score of {overall_score}/100 ({grade}). "
                f"The argument maintains high logical rigor with zero detected cognitive fallacies, "
                f"featuring a clear thesis: '{arguments.central_claim[:80]}…'."
            )
        fallacy_names = ", ".join(set(f.fallacy_type for f in fallacies))
        return (
            f"Evaluated speech achieved a score of {overall_score}/100 ({grade}). "
            f"While the central argument is identifiable, the speaker committed {len(fallacies)} "
            f"logical fallacy error(s) ({fallacy_names}), which significantly undermines logical validity and persuasion."
        )

    def _identify_strengths(
        self,
        criteria: EvaluationCriteria,
        arguments: ExtractedArgument,
        fallacies: list[FallacyItem],
    ) -> list[str]:
        strengths = []
        if criteria.clarity >= 75:
            strengths.append("High clarity and fluent sentence construction.")
        if criteria.relevance >= 75:
            strengths.append("Strong thematic alignment to the debate motion.")
        if arguments.evidence_strength_rating == "strong":
            strengths.append("Concrete empirical data and verifiable citations provided.")
        elif arguments.evidence_points:
            strengths.append("Included supporting examples and references.")
        if len(fallacies) == 0:
            strengths.append("Impeccable structural validity; completely devoid of fallacious claims.")
        if criteria.persuasiveness >= 75:
            strengths.append("Compelling rhetorical delivery and persuasive tone.")
        if not strengths:
            strengths.append("Identifiable central thesis that gives the speech a focal direction.")
        return strengths

    def _identify_improvements(
        self,
        fallacies: list[FallacyItem],
        criteria: EvaluationCriteria,
        word_count: int,
    ) -> list[str]:
        flaws = []
        for f in fallacies:
            flaws.append(f"Remediate {f.fallacy_type}: '{f.quote[:60]}…' — {f.explanation}")
        if criteria.evidence_strength < 60:
            flaws.append("Evidence is sparse; substantiate claims with empirical statistics or peer-reviewed studies.")
        if criteria.clarity < 65:
            flaws.append("Sentence structures are overly dense; shorten long clauses to improve judge comprehension.")
        if word_count < 80:
            flaws.append("Speech length is brief; elaborate on secondary warrants and impact calculus.")
        if not flaws:
            flaws.append("Maintain evidence freshness by incorporating the most recent 2025/2026 data points.")
        return flaws[:4]

    def _generate_recommendations(
        self,
        fallacies: list[FallacyItem],
        criteria: EvaluationCriteria,
        arguments: ExtractedArgument,
    ) -> list[str]:
        recs = []
        if fallacies:
            recs.append("Study the Logical Fallacy Lab to replace ad hominems and slippery slopes with causal chain warrants.")
        if arguments.evidence_strength_rating != "strong":
            recs.append("Adopt the A-R-E-I model (Assertion, Reasoning, Evidence, Impact) for every major point.")
        if criteria.logical_consistency < 75:
            recs.append("Map out premises beforehand to ensure they deductively entail the stated conclusion.")
        recs.append("Engage in timed crossfire drills to strengthen spontaneous rebuttal defense.")
        return recs


analysis_engine = ArgumentAnalysisEngine()
