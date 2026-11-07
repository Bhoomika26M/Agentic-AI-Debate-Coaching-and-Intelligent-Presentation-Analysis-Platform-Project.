"""
Fallacy Knowledge Base & Detection Rules
=========================================
Defines the 8 core debate fallacies supported across the platform:
1. Ad Hominem
2. Straw Man
3. False Dilemma
4. Slippery Slope
5. Appeal to Authority
6. Circular Reasoning
7. Hasty Generalization
8. Red Herring

Contains standard rubric definitions and heuristic regex patterns.
"""

from app.schemas.analysis import FallacyDefinition

# ── Supported Fallacies ───────────────────────────────────────────────────────

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

