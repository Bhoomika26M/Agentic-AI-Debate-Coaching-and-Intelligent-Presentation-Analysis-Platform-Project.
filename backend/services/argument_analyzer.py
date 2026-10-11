

import re
import spacy
from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim


# Load the English NLP pipeline.
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = spacy.blank("en")
    nlp.add_pipe("sentencizer")


# Load the semantic similarity model once.
semantic_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)


def calculate_similarity(claim: str, evidence: str) -> float:
    """Calculate semantic similarity between a claim and evidence."""

    embeddings = semantic_model.encode(
        [claim, evidence],
        convert_to_tensor=True,
    )

    similarity = cos_sim(
        embeddings[0], embeddings[1]
    ).item()

    return round(float(similarity), 3)



FALLACY_PATTERNS = {
    "Ad Hominem": {
        
"patterns": [
    r"\b(?:he|she|they|you|john|mary)\s+(?:is|are|was|were)\s+(?:stupid|ignorant|idiotic|incompetent|dishonest)\b",
    r"\b(?:stupid|idiotic|ignorant|incompetent)\s+(?:person|people|fool)\b",
    r"\b(?:reject|dismiss|ignore)\b.{0,60}\b(?:because|since)\b.{0,60}\b(?:stupid|ignorant|idiotic|incompetent|knows nothing)\b",
    r"\b(?:knows nothing|doesn't know anything)\b",
    r"\b(?:he|she|they|you|john|mary)\s+(?:is|are|was|were)\s+(?:a\s+)?(?:fool|loser|idiot)\b",
    
r"\banyone who\b.{0,100}\b(?:does not care|doesn't care|doesn't know|is stupid|is ignorant)\b",

],

        "explanation": (
            "This wording may attack a person rather than address "
            "their argument."
        ),
    },
    "Straw Man": {
        
"patterns": [
    r"\b(?:my opponent|the other side|my opponent's argument)\b.{0,100}\b(?:wants to|want to|claims that|argues that|believes that)\b",
    r"\b(?:you|they|he|she)\s+(?:want|wants)\s+to\s+(?:ban|abolish|eliminate|destroy)\b",
    r"\b(?:ban all|abolish all|eliminate all)\s+\w+",
    r"\bmake life impossible\b",
    r"\bso you're saying\b.{0,100}\b(?:all|every|nothing|never|always)\b",
    r"\b(?:twist|misrepresent|distort)\b.{0,60}\b(?:argument|position|proposal|words)\b",
],

        "explanation": (
            "This wording may misrepresent an opposing argument "
            "instead of addressing its actual position."
        ),
    },
    "False Dilemma": {
        "patterns": [
            r"\beither .+ or\b",
            r"\byou are either .+ or\b",
            r"\bonly two choices\b",
            r"\bthere are only two options\b",
        ],
        "explanation": (
            "This wording may overlook other reasonable possibilities."
        ),
    },
    "Slippery Slope": {
        
"patterns": [
    r"\bif\b.{0,100}\b(?:then|will|would|going to)\b.{0,150}\b(?:eventually|ultimately|therefore|as a result)\b",
    r"\b(?:if we allow|if we let|once we allow|once we let)\b.{0,150}\b(?:eventually|ultimately|soon|then)\b",
    r"\b(?:this will lead to|this could lead to|will inevitably lead to|will result in|will cause)\b.{0,100}\b(?:eventually|ultimately|collapse|disaster|nobody|everyone)\b",
    r"\b(?:first|next|then|finally)\b.{0,150}\b(?:eventually|ultimately|disaster|collapse)\b",
    r"\b(?:one thing leads to another|chain reaction|slippery slope)\b",
],

        "explanation": (
            "This wording may assume that one action will trigger "
            "a chain of consequences without sufficient support."
        ),
    },

            "Appeal to Authority": {
        
"patterns": [
    r"\b(?:a|the|this|that)\s+(?:famous|popular|well-known|celebrity|renowned)\s+(?:actor|actress|singer|celebrity|influencer)\b.{0,100}\b(?:says|said|claims|claimed|believes|believed)\b",
    r"\b(?:an?|the)\s+(?:famous|popular|well-known|celebrity)\s+\w+\b.{0,100}\b(?:so|therefore|hence)\b.{0,60}\b(?:must be|must mean|is definitely|has to be)\b",
    r"\b(?:expert|celebrity|famous person|influencer)\s+(?:says|said|claims|claimed)\b.{0,100}\b(?:so|therefore|hence)\b",
    r"\b(?:because|since)\b.{0,80}\b(?:a famous person|a celebrity|an influencer|an expert)\b.{0,80}\b(?:must be true|must be safe|is definitely true)\b",
    r"\b(?:everyone trusts|we should believe)\b.{0,80}\b(?:because|since)\b.{0,80}\b(?:famous|celebrity|expert)\b",
],

        "explanation": (
            "This wording may rely on someone's authority instead "
            "of providing relevant evidence. Expert testimony is "
            "not automatically a fallacy."
        ),
    },

        "Appeal to Popularity": {
        "patterns": [
            r"\beveryone believes\b",
            r"\beveryone is doing it\b",
            r"\bmost people believe\b",
            r"\bpopular opinion is that\b",
            r"\bit must be true because everyone\b",
        ],
        "explanation": (
            "This wording may treat popularity as proof instead "
            "of providing supporting evidence."
        ),
    },
        "Circular Reasoning": {
        
"patterns": [
    r"\b(?:this|that|the)\s+(?:rule|claim|argument|statement|decision)\b.{0,80}\b(?:because|since)\b.{0,50}\b(?:we must|it is|this is|that is)\b.{0,50}\b(?:have this rule|true|correct|necessary|valid)\b",
    r"\b(?:is true|is correct|is valid|is necessary)\b.{0,80}\b(?:because|since)\b.{0,80}\b(?:it is true|it is correct|it is valid|it is necessary)\b",
    r"\b(?:we must believe|you should believe)\b.{0,80}\b(?:because|since)\b.{0,80}\b(?:it is true|we must believe it|it must be believed)\b",
    r"\b(?:the claim is true because the claim is true|this is correct because this is correct)\b",
    r"\b(?:because|since)\b.{0,80}\b(?:it is true|it is correct|it is necessary)\b.{0,80}\b(?:because|since)\b",
],

        "explanation": (
            "This wording may repeat the claim as its own support "
            "instead of providing independent evidence."
        ),
    },
    "Hasty Generalization": {
        "patterns": [
            r"\ball .+ are\b",
            r"\beveryone always\b",
            r"\bno one ever\b",
            r"\bafter one experience\b.*\beveryone\b",
        ],
        "explanation": (
            "This wording may generalize too broadly from "
            "insufficient evidence."
        ),
    },
    "Red Herring": {
        
"patterns": [
    r"\bbut what really matters is\b",
    r"\b(?:instead of|rather than|forget about|never mind)\b.{0,100}\b(?:the issue|the problem|the question|safety|evidence|the facts)\b",
    r"\b(?:the real issue|the real question|what matters most)\b.{0,100}\b(?:is that|is the fact that)\b",
    r"\b(?:why are we talking about|let's talk about something else|that is not the point)\b",
    r"\b(?:we should discuss|we should focus on)\b.{0,100}\b(?:but|however|instead)\b.{0,100}\b(?:sponsors|sponsorship|popular|famous|sports team)\b",
],

        "explanation": (
            "This wording may divert attention from the main issue "
            "rather than address the original argument."
        ),
    },
}



FALLACY_CORRECTIONS = {
    "Ad Hominem": (
        "Focus on the person's argument and explain which claim, "
        "evidence, or reasoning you disagree with."
    ),
    "Straw Man": (
        "Restate the opposing argument fairly before explaining "
        "why you disagree with it."
    ),
    "False Dilemma": (
        "Consider whether additional reasonable options exist "
        "instead of presenting only two choices."
    ),
    "Slippery Slope": (
        "Explain each step in the predicted chain of consequences "
        "and provide evidence supporting those connections."
    ),
    "Appeal to Authority": (
        "Provide supporting evidence and check the expert's "
        "relevant qualifications and the reliability of the source."
    ),
    "Appeal to Popularity": (
        "Support the claim with reliable evidence rather than "
        "assuming that popularity makes it true."
    ),
    "Circular Reasoning": (
        "Provide independent evidence or reasoning instead of "
        "repeating the original claim as its own proof."
    ),
    "Hasty Generalization": (
        "Use a larger and more representative set of examples "
        "before making a general conclusion."
    ),
    "Red Herring": (
        "Return to the original question and explain how your "
        "points directly address it."
    ),
}



EVIDENCE_MARKERS = (
    "for example",
    "for instance",
    "according to",
    "research shows",
    "evidence suggests",
    "data shows",
    "studies show",
    "the results show",
    "a study published",
    "a report published",
)


SOURCE_MARKERS = (
    "according to",
    "research shows",
    "research suggests",
    "studies show",
    "studies suggest",
    "a study published",
    "a report published",
    "official report",
    "official statistics",
    "government data",
    "peer-reviewed study",
    "scientific evidence",
    "survey conducted",
    "data published",
)



def detect_source_indicators(text: str) -> dict:
    """Detect source references and identify organizations with spaCy."""

    lowered = text.lower()

    detected_markers = [
        marker
        for marker in SOURCE_MARKERS
        if re.search(
            rf"\b{re.escape(marker)}\b",
            lowered,
        )
    ]

    # Use spaCy's trained Named Entity Recognition model.
    doc = nlp(text)

    organizations = [
        ent.text.strip()
        for ent in doc.ents
        if ent.label_ == "ORG"
    ]

    # Remove duplicate organization names.
    organizations = list(dict.fromkeys(organizations))

    named_source = None

    if organizations and detected_markers:
        named_source = organizations[0]
        status = "named_source_detected"
        explanation = (
            f"An organization was identified in the text: {named_source}. "
            "Its identity and credibility have not been independently verified."
        )
    elif detected_markers:
        status = "source_mentioned_but_not_identified"
        explanation = (
            "The text contains source-related wording, but no named "
            "organization was identified by spaCy."
        )
    elif organizations:
        status = "organization_detected"
        explanation = (
            f"The text mentions an organization: {organizations[0]}, "
            "but no explicit source reference was identified."
        )
    else:
        status = "no_source_indicators_found"
        explanation = (
            "No explicit source reference or organization was identified "
            "by the current rules and NLP model."
        )

    return {
        "status": status,
        "detected_markers": detected_markers,
        "named_source": named_source,
        "detected_organizations": organizations,
        "verification_status": "not_verified",
        "explanation": explanation,
    }




    # Avoid treating generic words as identifiable organizations.
    generic_sources = {
        "a study",
        "an study",
        "a university",
        "the university",
        "a report",
        "an official report",
        "a research paper",
        "a survey",
    }

    named_source = None

    if organization_match:
        candidate = organization_match.group(1).strip(" .,")
        if candidate.lower() not in generic_sources:
            named_source = candidate

    if named_source:
        status = "named_source_detected"
        explanation = (
            f"The text appears to name a source or organization: "
            f"{named_source}. Its identity and credibility have not "
            f"been independently verified."
        )
    elif detected_markers:
        status = "source_mentioned_but_not_identified"
        explanation = (
            "The text refers to research, reports, or other sources, "
            "but a specific source could not be identified reliably."
        )
    else:
        status = "no_source_indicators_found"
        explanation = (
            "The current rules did not identify explicit source-related "
            "wording. A source may still be present without these phrases."
        )

    return {
        "status": status,
        "detected_markers": detected_markers,
        "named_source": named_source,
        "verification_status": "not_verified",
        "explanation": explanation,
    }



CONCLUSION_MARKERS = (
    "therefore",
    "in conclusion",
    "to conclude",
    "thus",
    "consequently",
)

REASONING_MARKERS = (
    "because",
    "therefore",
    "as a result",
    "this means",
    "consequently",
    "this shows",
    "this suggests",
    "which means",
)





def extract_claim(first_sentence: str) -> str:
    """Extract a claim while safely handling speaker labels and source prefixes."""

    text = first_sentence.strip()

    # Remove a speaker label only when followed by actual text.
    cleaned_text = re.sub(
        r"^(?:person\s+[a-z]|speaker\s+\d+|"
        r"proponent|opponent|moderator)\s*:\s*(?=\S)",
        "",
        text,
        count=1,
        flags=re.IGNORECASE,
    )

    # Use the cleaned text only if it is not empty.
    if cleaned_text.strip():
        text = cleaned_text.strip()

    # Remove common source-introduction phrases.
    source_prefixes = [
        r"^according to (?:a|an|the)\s+[^,]+,\s*",
        r"^according to\s+[^,]+,\s*",
        r"^research shows that\s+",
        r"^research suggests that\s+",
        r"^studies show that\s+",
        r"^studies suggest that\s+",
        r"^evidence suggests that\s+",
        r"^data shows that\s+",
    ]

    for pattern in source_prefixes:
        text = re.sub(
            pattern,
            "",
            text,
            count=1,
            flags=re.IGNORECASE,
        )

    # Extract the claim before a because-clause.
    match = re.search(
        r"^(.+?)\s+because\b",
        text,
        flags=re.IGNORECASE,
    )

    if match:
        text = match.group(1).strip()

    return text.strip()







def extract_evidence(sentences: list[str]) -> list[str]:
    """Extract supporting information without treating a repeated claim as evidence."""

    evidence = []

    evidence_markers = (
        "for example",
        "for instance",
        "research shows",
        "research suggests",
        "studies show",
        "studies suggest",
        "a study found",
        "a report found",
        "statistics show",
        "data shows",
        "data show",
        "evidence shows",
        "the survey found",
    )

    source_markers = (
        "according to",
        "published by",
        "reported by",
        "data from",
        "statistics from",
    )

    for sentence in sentences:
        normalized = re.sub(r"\s+", " ", sentence).strip()

        if not normalized:
            continue

        lowered = normalized.lower()

        has_evidence_marker = any(
            marker in lowered for marker in evidence_markers
        )

        has_source_marker = any(
            marker in lowered for marker in source_markers
        )

        # A source reference alone does not establish supporting evidence.
        if has_source_marker and not has_evidence_marker:
            continue

        if has_evidence_marker:
            evidence.append(normalized)
            continue

        # Extract the reason following "because", if it adds information.
        parts = re.split(
            r"\bbecause\b",
            normalized,
            maxsplit=1,
            flags=re.IGNORECASE,
        )

        if len(parts) == 2:
            reason = parts[1].strip()

            # Avoid empty reasons and direct repetitions of the whole sentence.
            if reason and reason.rstrip(".!?").lower() != (
                normalized.rstrip(".!?").lower()
            ):
                evidence.append(reason)

    return list(dict.fromkeys(evidence))








def detect_fallacies(text: str) -> list[dict]:
    """Detect possible fallacies and suggest corrections."""

    lowered = text.lower()
    fallacy_details = []

    for fallacy_name, details in FALLACY_PATTERNS.items():
        if any(
            re.search(pattern, lowered)
            for pattern in details["patterns"]
        ):
            fallacy_details.append({
                "name": fallacy_name,
                "explanation": details["explanation"],
                "correction": FALLACY_CORRECTIONS.get(
                    fallacy_name,
                    "Review the reasoning and provide relevant evidence."
                ),
            })

    return fallacy_details



def score_clarity(
    text: str,
    sentences: list[str],
    words: list[str],
) -> int:
    """Estimate clarity using sentence structure and wording cues."""

    if not text.strip() or not words:
        return 0

    score = 60

    # Reward sufficient detail.
    if len(words) >= 10:
        score += 10

    # Reward a manageable number of sentences.
    if 2 <= len(sentences) <= 6:
        score += 10

    average_sentence_length = (
        len(words) / len(sentences) if sentences else 0
    )

    if 5 <= average_sentence_length <= 30:
        score += 10
    elif average_sentence_length > 40:
        score -= 15

    # Flag broad wording for review; it does not prove poor clarity.
    absolute_terms = (
        "always",
        "everyone",
        "never",
        "no one",
    )

    lowered = text.lower()

    if any(
        re.search(rf"\b{re.escape(term)}\b", lowered)
        for term in absolute_terms
    ):
        score -= 10

    # Penalize text with no sentence-ending punctuation.
    if not re.search(r"[.!?]\s*$", text):
        score -= 5

    return max(0, min(score, 100))






def score_relevance(evidence_analysis: list[dict]) -> int:
    """Estimate relevance from claim-evidence semantic similarity."""

    if not evidence_analysis:
        return 0

    similarities = [
        max(-1.0, min(1.0, float(item["similarity_score"])))
        for item in evidence_analysis
    ]

    average = sum(similarities) / len(similarities)

    # Map cosine similarity conservatively:
    # 0.20 or lower -> 0
    # 0.70 or higher -> 100
    score = ((average - 0.20) / (0.70 - 0.20)) * 100

    return max(0, min(round(score), 100))







def score_evidence_strength(
    evidence: list[str],
    text: str,
) -> int:
    """Estimate evidence strength using transparent text-based cues.

    This is a heuristic estimate, not a verification of evidence quality.
    """

    if not evidence:
        return 0

    score = 20

    # Reward multiple distinct pieces of supporting information.
    score += min(len(evidence) - 1, 3) * 10

    lowered = text.lower()

    # Examples illustrate a claim but do not prove it.
    if any(
        marker in lowered
        for marker in ("for example", "for instance")
    ):
        score += 5

    # Specific numerical details may improve precision.
    has_numbers = any(
        re.search(r"\b\d+(?:\.\d+)?%?\b", item)
        for item in evidence
    )
    if has_numbers:
        score += 10

    # Source wording alone is not proof of credibility.
    source_markers = (
        "according to",
        "research shows",
        "research suggests",
        "studies show",
        "studies suggest",
        "data shows",
        "data show",
        "the results show",
    )

    if any(marker in lowered for marker in source_markers):
        score += 5

    # Detailed explanations may provide more context.
    if any(len(item.split()) >= 10 for item in evidence):
        score += 10

    return max(0, min(score, 100))







def score_logical_consistency(
    text: str,
    sentences: list[str],
    evidence: list[str],
    fallacies: list[dict],
) -> int:
    """Estimate logical consistency using structural cues and contradiction checks."""

    if not text.strip():
        return 0

    score = 50
    lowered = text.lower()

    # Reward explicit reasoning language.
    has_reasoning = any(
        marker in lowered for marker in REASONING_MARKERS
    )
    if has_reasoning:
        score += 10

    # Reward an explicit conclusion in a multi-sentence argument.
    has_conclusion = any(
        marker in lowered for marker in CONCLUSION_MARKERS
    )
    if has_conclusion and len(sentences) >= 2:
        score += 5

    # Reward identified supporting reasons.
    if evidence:
        score += 10

    # Detect selected, obvious contradictory phrase pairs.
    contradiction_pairs = (
        ("exercise is important", "exercise has no benefits"),
        ("exercise is beneficial", "exercise is not beneficial"),
        ("is always true", "is never true"),
        ("everyone supports", "no one supports"),
        ("all students passed", "no students passed"),
        ("is effective", "is not effective"),
        ("is safe", "is not safe"),
        ("is beneficial", "is not beneficial"),
        ("is necessary", "is not necessary"),
        ("should be allowed", "should not be allowed"),
    )

    has_contradiction = any(
        phrase_a in lowered and phrase_b in lowered
        for phrase_a, phrase_b in contradiction_pairs
    )

    if has_contradiction:
        score -= 25

    # Broad claims deserve review, but wording alone does not prove
    # that an argument is logically inconsistent.
    absolute_terms = ("always", "everyone", "never", "no one")
    if any(
        re.search(rf"\b{re.escape(term)}\b", lowered)
        for term in absolute_terms
    ):
        score -= 10

    # Possible fallacies are warnings, not definitive judgments.
    score -= 10 * len(fallacies)

    return max(0, min(score, 100))






def score_persuasiveness(
    clarity: int,
    relevance: int,
    evidence_strength: int,
    logical_consistency: int,
) -> int:
    """Estimate persuasiveness from the four evaluation criteria."""

    score = (
        clarity * 0.20
        + relevance * 0.25
        + evidence_strength * 0.30
        + logical_consistency * 0.25
    )

    return max(0, min(round(score), 100))



def analyze_argument(argument_text: str) -> dict:
    """Analyze an argument using NLP and transparent heuristics."""

    text = argument_text.strip()

    if not text:
        raise ValueError("Argument text cannot be empty.")

    doc = nlp(text)

    sentences = [
        re.sub(r"\s+", " ", sentence.text).strip()
        for sentence in doc.sents
        if sentence.text.strip()
    ]

    words = re.findall(r"\b[\w'-]+\b", text)

    claim = extract_claim(sentences[0] if sentences else text)

    # Extract complete evidence sentences rather than clause fragments.
    evidence = extract_evidence(sentences)

    evidence_analysis = []

    for item in evidence:
        similarity = calculate_similarity(claim, item)

        evidence_analysis.append({
            "text": item,
            "similarity_score": similarity,
        })

    fallacy_details = detect_fallacies(text)
    source_assessment = detect_source_indicators(text)
    possible_fallacies = [
        item["name"] for item in fallacy_details
    ]

    # Five required evaluation criteria.
    clarity = score_clarity(text, sentences, words)

    relevance = score_relevance(evidence_analysis)

    evidence_strength = score_evidence_strength(evidence, text)

    logical_consistency = score_logical_consistency(
        text,
        sentences,
        evidence,
        fallacy_details,
    )

    persuasiveness = score_persuasiveness(
        clarity,
        relevance,
        evidence_strength,
        logical_consistency,
    )

    # Equal-weight overall score for the initial baseline.
    argument_score = round(
        (
            clarity
            + relevance
            + evidence_strength
            + logical_consistency
            + persuasiveness
        ) / 5
    )

   
    feedback = []

    if clarity < 60:
        feedback.append(
            "Improve clarity by expressing your main point directly "
            "and using clear, manageable sentences."
        )

    if not evidence:
        feedback.append(
            "Add specific supporting examples, facts, or reliable "
            "sources. The current rules did not identify explicit "
            "evidence markers."
        )
    elif relevance < 60:
        feedback.append(
            "Explain more clearly how each supporting example "
            "connects to your main claim."
        )

    if evidence_strength < 60:
        has_example = any(
            marker in text.lower()
            for marker in ("for example", "for instance")
        )

        if has_example:
            feedback.append(
                "Your example provides useful illustration. Strengthen "
                "the argument further with specific facts, measurable "
                "details, or independently verifiable supporting evidence."
            )
        else:
            feedback.append(
                "Strengthen your evidence with specific facts, relevant "
                "examples, or independently verifiable supporting information."
            )

    has_source = source_assessment["status"] in (
        "named_source_detected",
        "source_mentioned_but_not_identified",
        "organization_detected",
    )

    if has_source:
        feedback.append(
            "A source is mentioned, but its credibility and support "
            "for this particular claim have not been independently verified."
        )

    
    
    if logical_consistency < 60:
        lowered_text = text.lower()

        contradiction_pairs = (
            ("exercise is important", "exercise has no benefits"),
            ("exercise is beneficial", "exercise is not beneficial"),
            ("is always true", "is never true"),
            ("everyone supports", "no one supports"),
            ("all students passed", "no students passed"),
            ("is effective", "is not effective"),
            ("is safe", "is not safe"),
            ("is beneficial", "is not beneficial"),
            ("is necessary", "is not necessary"),
            ("should be allowed", "should not be allowed"),
        )

        has_contradiction = any(
            phrase_a in lowered_text and phrase_b in lowered_text
            for phrase_a, phrase_b in contradiction_pairs
        )

        
        if has_contradiction:
            feedback.append(
                "Possible contradiction detected: two statements "
                "in your argument appear to conflict. Identify the "
                "specific statements, check whether they refer to "
                "the same situation, and clarify your intended position."
            )
        else:
            feedback.append(
                "Explain how each supporting reason connects to "
                "your main claim. Check whether your conclusions "
                "follow from the reasons and evidence provided."
            )

    

    


    if persuasiveness < 60:
        feedback.append(
            "Make your argument more convincing by combining a clear "
            "claim, relevant support, and explicit reasoning."
        )

    if possible_fallacies:
        feedback.append(
            "Review the possible fallacies listed below. "
            "Pattern matches are warnings, not proof of a fallacy."
        )

    # Remove duplicate feedback while preserving its order.
    feedback = list(dict.fromkeys(feedback))

    if not feedback:
        feedback.append(
            "Your argument has a useful structure. Continue improving "
            "the quality of your support and the connection between "
            "your evidence and conclusion."
        )


   
    reasoning_analysis = []

    lowered_text = text.lower()

    reasoning_markers = (
        "because",
        "therefore",
        "since",
        "this means",
        "as a result",
        "consequently",
        "thus",
        "for this reason",
    )

    has_explicit_reasoning = any(
        marker in lowered_text
        for marker in reasoning_markers
    )

    has_example = any(
        marker in lowered_text
        for marker in ("for example", "for instance")
    )

    if has_explicit_reasoning:
        reasoning_analysis.append(
            "The argument uses explicit reasoning language. "
            "Check whether the stated reason genuinely supports the claim."
        )
    elif has_example:
        reasoning_analysis.append(
            "The argument provides an illustrative example. "
            "Explain explicitly how the example supports the main claim."
        )
    else:
        reasoning_analysis.append(
            "The argument needs a clearer explanation of why its reasons "
            "support the main claim."
        )

    if not evidence:
        reasoning_analysis.append(
            "No explicit supporting evidence was identified by the current rules."
        )
    elif not has_explicit_reasoning:
        reasoning_analysis.append(
            "The connection between the supporting evidence and the claim "
            "could be explained more clearly."
        )

    if any(
        term in lowered_text
        for term in ("always", "everyone", "never", "no one")
    ):
        reasoning_analysis.append(
            "The argument uses broad or absolute wording. Consider whether "
            "the claim can be supported for all cases."
        )

    if possible_fallacies:
        reasoning_analysis.append(
            "Review the possible fallacies and examine whether any weaken "
            "the reasoning. Pattern matches alone do not prove a fallacy."
        )

    evaluation_criteria = {
        "clarity": clarity,
        "relevance": relevance,
        "evidence_strength": evidence_strength,
        "logical_consistency": logical_consistency,
        "persuasiveness": persuasiveness,
    }

    return {
        # Existing response fields: preserved for the frontend.
        "claim": claim,
        "evidence": evidence,
        "evidence_analysis": evidence_analysis,
        "possible_fallacies": possible_fallacies,
        "fallacy_details": fallacy_details,
        "argument_score": argument_score,
        "feedback": feedback,
        "word_count": len(words),
        "sentence_count": len(sentences),
        "analysis_type": "rule_based_baseline_v3",

        # New evaluation fields.
        "evaluation_criteria": evaluation_criteria,
        "reasoning_analysis": reasoning_analysis,
        "source_assessment": source_assessment,
    }

if __name__ == "__main__":
    test_text = (
        "According to the World Health Organization, "
        "reliable health information helps people make informed decisions."
    )

    print(detect_source_indicators(test_text))
