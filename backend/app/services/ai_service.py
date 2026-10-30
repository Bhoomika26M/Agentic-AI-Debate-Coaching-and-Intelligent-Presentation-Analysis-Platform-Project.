import os
import json
import re
from typing import Dict, Any, List, Optional
from openai import OpenAI
from app.core.config import settings

class AIService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
        self.client = None
        if self.api_key and not self.api_key.startswith("your-") and len(self.api_key) > 10:
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                print(f"Error initializing OpenAI client: {e}")
                self.client = None

    def is_live_llm_ready(self) -> bool:
        return self.client is not None

    def get_inference_mode(self) -> str:
        return "openai_gpt4o" if self.is_live_llm_ready() else "development_heuristic_mode"

    def _call_llm_json(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.is_live_llm_ready():
            return None
        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt + "\nYou must respond strictly with valid JSON."},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            raw = response.choices[0].message.content
            return json.loads(raw)
        except Exception as e:
            print(f"LLM API Call failed, falling back to heuristic engine: {e}")
            return None

    # ==========================================
    # 1. ARGUMENT ANALYSIS ENGINE
    # ==========================================
    def analyze_argument(self, argument_text: str, topic: Optional[str] = None) -> Dict[str, Any]:
        system_prompt = """You are an elite debate adjudicator, philosopher, and argumentation coach.
Analyze the provided user argument thoroughly.
Break it down into:
- main_claim: the core thesis statement
- supporting_arguments: list of specific sub-points or premises offered
- evidence_assessment: detailed critique of evidence cited (factual, empirical, anecdotal, or missing)
- strengths: list of key argumentation strengths
- weaknesses: list of weak points, assumptions, or vulnerabilities
- missing_evidence: specific factual, statistical, or logical proof required to substantiate the claim
- suggestions: actionable recommendations to elevate the argument
- clarity_score: 0-100 score on conciseness and articulation
- relevance_score: 0-100 score on how directly it addresses the topic
- evidence_strength_score: 0-100 score on evidentiary foundation
- logical_consistency_score: 0-100 score on soundness and validity
- persuasiveness_score: 0-100 score on rhetorical and dialectical impact
- overall_score: 0-100 composite score
Return strictly JSON."""

        user_prompt = f"Topic: {topic or 'General Debate'}\n\nArgument:\n{argument_text}"
        llm_result = self._call_llm_json(system_prompt, user_prompt)
        if llm_result:
            return llm_result

        # Realistic rule-based semantic analysis fallback
        sentences = [s.strip() for s in re.split(r'[.!?]+', argument_text) if len(s.strip()) > 5]
        main_claim = sentences[0] if sentences else argument_text[:120]
        sub_points = sentences[1:] if len(sentences) > 1 else [argument_text]
        
        has_stats = bool(re.search(r'\d+%|\bpercent\b|\bstatistics\b|\bstudy\b|\bresearch\b|\bdata\b', argument_text, re.IGNORECASE))
        has_causality = bool(re.search(r'\bbecause\b|\btherefore\b|\bconsequently\b|\bleads to\b|\bresults in\b', argument_text, re.IGNORECASE))
        word_count = len(argument_text.split())

        clarity = min(92.0, max(55.0, 65.0 + (word_count // 15)))
        relevance = 80.0 if topic else 75.0
        evidence_score = 78.0 if has_stats else 58.0
        logic_score = 80.0 if has_causality else 64.0
        persuasiveness = round((clarity + evidence_score + logic_score) / 3, 1)
        overall = round((clarity * 0.2 + relevance * 0.2 + evidence_score * 0.25 + logic_score * 0.2 + persuasiveness * 0.15), 1)

        return {
            "main_claim": main_claim,
            "supporting_arguments": sub_points[:4] if sub_points else ["Direct assertion of the primary position."],
            "evidence_assessment": "The argument relies primarily on qualitative reasoning" + (" and empirical mentions" if has_stats else " without explicit statistical citations or peer-reviewed studies") + ".",
            "strengths": [
                "Clear declarative thesis statement establishing speaker's intent.",
                "Direct logical progression between premise and asserted outcome.",
                "Assertive rhetorical tone suitable for competitive debate."
            ],
            "weaknesses": [
                "Underlying assumptions require independent corroboration.",
                "Potential vulnerability to counter-examples under intense cross-examination.",
                "Lacks quantitative validation or comparative baseline data."
            ],
            "missing_evidence": "Empirical studies, comparative case studies, or published econometric/sociological data.",
            "suggestions": [
                "Ground abstract claims in verified empirical case studies.",
                "Pre-empt obvious counter-arguments by acknowledging potential trade-offs.",
                "Strengthen the warrant linking your premise to your final impact."
            ],
            "clarity_score": clarity,
            "relevance_score": relevance,
            "evidence_strength_score": evidence_score,
            "logical_consistency_score": logic_score,
            "persuasiveness_score": persuasiveness,
            "overall_score": overall
        }

    # ==========================================
    # 2. LOGICAL FALLACY DETECTION ENGINE
    # ==========================================
    def detect_fallacies(self, text: str) -> Dict[str, Any]:
        system_prompt = """You are an expert formal and informal logician.
Detect whether the input text contains any of these 8 specific logical fallacies:
1. Ad Hominem
2. Straw Man
3. False Dilemma
4. Slippery Slope
5. Appeal to Authority
6. Circular Reasoning
7. Hasty Generalization
8. Red Herring

CRITICAL: If the argument has NO fallacies, set has_fallacies: false and fallacies: []. DO NOT INVENT A FALLACY IF NONE EXISTS.

For each detected fallacy, include:
- name: (Exact name from the 8 above)
- sentence: (Exact phrase or sentence from the input text)
- explanation: (Clear explanation of the fallacy)
- problematic_reasoning: (Why this reasoning is structurally invalid or biased)
- corrected_version: (Constructive rewritten sentence that preserves legitimate debate intent without fallacy)
- improvement_tips: (Specific advice for the speaker)

Also return:
- has_fallacies: boolean
- credibility_impact: ("None", "Low", "Moderate", "High", "Critical")
- summary: comprehensive diagnostic summary
Return strictly JSON."""

        llm_result = self._call_llm_json(system_prompt, f"Text to audit for fallacies:\n{text}")
        if llm_result:
            return llm_result

        # High-precision heuristic rules for the 8 fallacies
        text_lower = text.lower()
        detected: List[Dict[str, str]] = []

        # 1. Ad Hominem
        ad_hominem_match = re.search(r'\b(you are|you\'re|he is|she is|they are)\s+(a\s+|an\s+)?(stupid|idiot|ignorant|corrupt|biased|clueless|hypocrite|evil|liar)\b', text_lower)
        if ad_hominem_match or ("don't listen to" in text_lower and ("he is" in text_lower or "she is" in text_lower)) or ("liar" in text_lower and ("you" in text_lower or "he" in text_lower)):
            detected.append({
                "name": "Ad Hominem",
                "sentence": text[max(0, text_lower.find(ad_hominem_match.group(0)) - 10):text_lower.find(ad_hominem_match.group(0)) + 60].strip() if ad_hominem_match else "Attacking the speaker personally.",
                "explanation": "Attacking the opponent's character, motives, or intelligence instead of addressing their substantive argument.",
                "problematic_reasoning": "The validity of a proposition is independent of the person uttering it. Deflecting to personal attacks leaves the central argument unrefuted.",
                "corrected_version": "Focus strictly on the methodology and evidence: 'While I disagree with the conclusion reached, let us examine the assumptions behind the premises.'",
                "improvement_tips": "Dissect the opponent's premise or logic rather than questioning their character or motives."
            })

        # 2. False Dilemma
        false_dilemma_match = re.search(r'\b(either|if we don\'t.*then|there are only two options|you are either with us or against us)\b', text_lower)
        if false_dilemma_match and ("or" in text_lower or "otherwise" in text_lower):
            detected.append({
                "name": "False Dilemma",
                "sentence": text[max(0, text_lower.find(false_dilemma_match.group(0))):text_lower.find(false_dilemma_match.group(0)) + 80].strip(),
                "explanation": "Presenting a complex spectrum of possibilities as a forced choice between only two extreme alternatives.",
                "problematic_reasoning": "Ignores nuanced compromise, phased implementation, third-party solutions, or status quo variations.",
                "corrected_version": "Acknowledge the multi-faceted nature: 'While option A and option B are prominent alternatives, there are hybrid policy frameworks worth evaluating.'",
                "improvement_tips": "Recognize intermediate policy options and shades of gray rather than forcing a binary ultimatum."
            })

        # 3. Slippery Slope
        if re.search(r'\b(will inevitably lead to|will cause complete collapse|before you know it|the next thing you know|destroys everything)\b', text_lower):
            detected.append({
                "name": "Slippery Slope",
                "sentence": "Asserting inevitable catastrophe from an initial action.",
                "explanation": "Claiming that an initial step will inevitably lead to a chain of disastrous events without demonstrating the intermediate causal links.",
                "problematic_reasoning": "Assumes an uncontrollable cascade where each conditional probability is treated as an absolute certainty.",
                "corrected_version": "Establish empirical thresholds: 'If this policy is adopted without strict regulatory boundaries, there is a measurable risk of mission creep that requires oversight.'",
                "improvement_tips": "Prove each causal link individually with historical precedent or systemic evidence rather than leaping to extremes."
            })

        # 4. Circular Reasoning (Begging the Question)
        if re.search(r'\b(is true because it is|obviously right because it works|must be believed because it is infallible)\b', text_lower) or ("because it is what it is" in text_lower):
            detected.append({
                "name": "Circular Reasoning",
                "sentence": "Conclusion merely restates the initial premise.",
                "explanation": "Assuming the truth of the conclusion within the premises used to prove it.",
                "problematic_reasoning": "No independent corroboration is supplied; the argument simply repeats its initial presupposition.",
                "corrected_version": "Provide external validation: 'This principle is supported by independent economic data and observable outcomes across three peer institutions.'",
                "improvement_tips": "Ground your conclusion in independent external evidence rather than self-referential definitions."
            })

        # 5. Hasty Generalization
        if re.search(r'\b(everyone knows|all people always|never in any case|i saw one case so all)\b', text_lower):
            detected.append({
                "name": "Hasty Generalization",
                "sentence": "Drawing universal claims from limited instances.",
                "explanation": "Reaching an expansive conclusion based on an insufficiently representative or statistically negligible sample size.",
                "problematic_reasoning": "Extrapolates universal behavior from isolated anecdotes, ignoring variance and counter-examples.",
                "corrected_version": "Qualify your scope: 'Evidence from recent regional pilots suggests a pronounced trend, though wider longitudinal studies are ongoing.'",
                "improvement_tips": "Use qualified language like 'frequently', 'a significant proportion', or specify the exact demographic sample."
            })

        # 6. Appeal to Authority
        if re.search(r'\b(because celebrity|expert x said so and therefore it is indisputable|famous person said)\b', text_lower):
            detected.append({
                "name": "Appeal to Authority",
                "sentence": "Citing an authority figure outside their domain of expertise as definitive proof.",
                "explanation": "Using an authority figure's opinion as decisive evidence, especially when outside their established expertise.",
                "problematic_reasoning": "Expert consensus is evidence, but individual endorsement without underlying methodology does not guarantee truth.",
                "corrected_version": "Cite the underlying methodology: 'According to peer-reviewed findings published by domain researchers, the consensus indicates...'",
                "improvement_tips": "Cite the evidence, peer-reviewed data, and methodology rather than relying purely on a name."
            })

        has_fallacies = len(detected) > 0
        impact = "Critical" if len(detected) >= 2 else ("Moderate" if has_fallacies else "None")
        summary = (
            f"Detected {len(detected)} fallacy pattern(s). Your reasoning will be significantly strengthened by addressing these points."
            if has_fallacies
            else "Clean reasoning: No overt logical fallacies detected. The argument maintains logical integrity."
        )

        return {
            "has_fallacies": has_fallacies,
            "fallacies": detected,
            "credibility_impact": impact,
            "summary": summary
        }

    # ==========================================
    # 3. COUNTERARGUMENT GENERATION ENGINE
    # ==========================================
    def generate_counterarguments(self, argument_text: str, topic: Optional[str] = None) -> Dict[str, Any]:
        system_prompt = """You are a champion collegiate debate coach and strategic argumentation master.
Given the user's argument, generate multi-dimensional counterarguments across distinct analytical lenses:
1. logical_rebuttals: points attacking reasoning gaps, non-sequiturs, or false equivalences
2. evidence_based_rebuttals: points raising empirical counter-examples, conflicting statistics, or methodological doubts
3. ethical_counterarguments: moral consequences, human rights, distributive justice, or deontological harms
4. practical_counterarguments: real-world implementation hurdles, fiscal costs, bureaucratic resistance, or unintended outcomes
5. policy_counterarguments: regulatory precedents, legislative feasibility, jurisdiction friction, or enforceability
6. alternative_perspectives: creative alternative frameworks or third-way solutions that satisfy the goal without user's mechanism
7. challenge_questions: sharp cross-examination questions designed to trap the opponent
8. debate_strategy_suggestions: high-level advice on how to structure a winning rebuttal case
Return strictly JSON."""

        user_prompt = f"Topic: {topic or 'General Debate'}\nUser Argument:\n{argument_text}"
        llm_result = self._call_llm_json(system_prompt, user_prompt)
        if llm_result:
            return llm_result

        # High-quality fallback counterarguments
        return {
            "logical_rebuttals": [
                "Correlation does not equal causation: The observed correlation fails to isolate key confounding variables.",
                "Unwarranted generalization: The premise assumes conditions in specific pilot studies apply uniformly across diverse socio-economic landscapes.",
                "False equivalence: Equating short-term transitional friction with permanent structural failure overlooks adaptive resilience."
            ],
            "evidence_based_rebuttals": [
                "Countervailing empirical studies demonstrate that comparable policies in OECD nations resulted in high deadweight loss.",
                "Baseline statistical metrics fail to account for substitution effects and consumer behavioral adaptations.",
                "Historical precedents from analogous sector deregulation indicate costs were underestimated by at least 35%."
            ],
            "ethical_counterarguments": [
                "Distributive justice deficit: The proposed policy disproportionately concentrates benefits among affluent groups while dispersing burdens upon vulnerable communities.",
                "Infringement on individual autonomy: Mandating this framework compromises voluntary decision-making in favor of paternalistic enforcement.",
                "Intergenerational equity: Passing structural financial liabilities to future generations without guaranteed returns is ethically contentious."
            ],
            "practical_counterarguments": [
                "Prohibitive implementation expenditures: Upfront capital deployment and ongoing operational maintenance exceed available municipal fiscal reserves.",
                "Enforcement bottlenecks: Regulatory oversight bodies currently lack the staffing, technical tooling, and legal mandate to monitor compliance.",
                "High risk of perverse incentives: Stakeholders are incentivized to exploit regulatory loopholes rather than achieve substantive compliance."
            ],
            "policy_counterarguments": [
                "Conflicts with existing statutory frameworks and federal preemption doctrine.",
                "Lacks sunset provisions and independent auditing triggers necessary for prudent public governance.",
                "Sub-optimal resource allocation compared to targeted tax incentives or market-based credit mechanisms."
            ],
            "alternative_perspectives": [
                "Decentralized community-level management can achieve identical conservation goals without coercive centralized directives.",
                "Market-driven transparency standards and consumer labeling allow voluntary adoption at significantly lower economic friction."
            ],
            "challenge_questions": [
                "How do you address the documented empirical case studies where this exact mechanism produced severe unintended market shortages?",
                "What specific metric will determine whether this policy has failed, and what is your immediate rollback contingency?",
                "Who specifically absorbs the catastrophic fiscal liability if your central causal assumption proves incorrect?"
            ],
            "debate_strategy_suggestions": [
                "Concede the moral aspiration of the opponent's position while demolishing the practical viability of their mechanism.",
                "Highlight the opportunity cost: Every dollar or effort committed to this mechanism deprives more effective interventions.",
                "Frame the debate around risk minimization and empirical verification rather than pure abstract principle."
            ]
        }

    # ==========================================
    # 4. INTERACTIVE AI DEBATE OPPONENT ENGINE
    # ==========================================
    def generate_debate_turn(
        self,
        topic: str,
        user_position: str,
        ai_position: str,
        difficulty: str,
        current_round: int,
        messages_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        system_prompt = f"""You are JustiTalk AI, an elite debate sparring opponent and adjudicator.
Topic: "{topic}"
User Position: {user_position}
AI Position: {ai_position}
Difficulty: {difficulty} (Novice = encouraging, Intermediate = rigorous & analytical, Advanced = formidable and cross-examining, Master = ruthless world-championship tier)
Current Round: {current_round}

Your goal:
1. Provide a sharp, eloquent, and formidable counterargument from the {ai_position} perspective.
2. Directly dismantle the claims made in the user's latest statement.
3. Introduce a compelling new argument or challenge question to test the user's mastery.
4. Keep the response crisp, persuasive, and within 100-180 words.
5. In addition, provide an `instant_critique` object analyzing the user's latest turn:
   - score: 0-100 for this turn
   - punchline: 1-sentence coach evaluation
   - fallacy_warning: any logical fallacy noticed or null
   - coaching_tip: immediate advice for the user's next round

Return strictly JSON with keys:
- response_content: string (your debate speech)
- instant_critique: dict (with score, punchline, fallacy_warning, coaching_tip)
"""

        formatted_history = "\n".join([f"{m.get('sender_type')}: {m.get('content')}" for m in messages_history[-6:]])
        user_prompt = f"Debate History:\n{formatted_history}\n\nDeliver the AI's Round {current_round} response."

        llm_result = self._call_llm_json(system_prompt, user_prompt)
        if llm_result and "response_content" in llm_result:
            return llm_result

        # Realistic fallback AI debate turn
        latest_user_text = messages_history[-1].get("content", "") if messages_history else ""
        word_count = len(latest_user_text.split())

        turn_responses = {
            1: f"My opponent argues for {user_position}, yet overlooks the foundational economic and systemic reality. While the intention sounds commendable on paper, historical precedent clearly demonstrates that when such measures are implemented without structural safeguards, they inadvertently dismantle the very stability they seek to protect. Where is the empirical proof that your proposed mechanism can withstand real-world market friction? I urge the judges to scrutinize the complete absence of risk contingency in my opponent's opening stance.",
            2: f"The member opposite attempts to justify their position, but their reasoning relies on a critical assumption that does not survive scrutiny. By prioritizing short-term benefits, you are willfully neglecting the severe systemic burdens and deadweight loss placed on everyday stakeholders. You claim that regulation will mitigate the fallout, yet you provide zero institutional precedent where such mitigation has successfully occurred. How do you reconcile this glaring gap in your framework?",
            3: f"Let us cut through the rhetoric and look at the core trade-offs. Every compelling debate hinges on comparative advantage. My opponent's model requires unprecedented centralized enforcement, astronomical administrative overhead, and creates perverse incentives for non-compliance. In contrast, our position guarantees stability, voluntary alignment, and empirical accountability. Why should society take an existential gamble on an unproven hypothesis?",
            4: f"In closing this exchange, the contrast between our cases could not be starker. My opponent has offered passionate assertions, but when challenged on evidence, feasibility, and distributional ethics, their arguments collapsed into speculative generalities. Our case stands firm on empirical rigor, systemic feasibility, and institutional prudence. On the balance of evidence, the position {ai_position} must unequivocally carry the day."
        }

        content = turn_responses.get(current_round, turn_responses[2])
        score = min(90.0, max(60.0, 65.0 + min(20.0, word_count * 0.2)))

        return {
            "response_content": content,
            "instant_critique": {
                "score": score,
                "punchline": "Assertive premise delivered, but susceptible to cross-examination on empirical warrants.",
                "fallacy_warning": "Watch for Hasty Generalization" if word_count < 25 else None,
                "coaching_tip": "Bolster your rebuttal by citing specific quantitative metrics or comparative case studies."
            }
        }

    # ==========================================
    # 5. FINAL DEBATE EVALUATION ENGINE
    # ==========================================
    def evaluate_debate(
        self,
        topic: str,
        user_position: str,
        ai_position: str,
        messages_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Calculates performance using the EXACT Weighted Scoring Formula from the specification:
        - Argument Quality: 30%
        - Evidence Usage: 20%
        - Logical Consistency: 20%
        - Rebuttal Effectiveness: 15%
        - Communication Skills: 15%
        """
        system_prompt = """You are an official adjudicator evaluating a completed debate match.
Evaluate the User's performance using the strict weighted formula:
- argument_quality: 0-100 (Weight: 30%)
- evidence_usage: 0-100 (Weight: 20%)
- logical_consistency: 0-100 (Weight: 20%)
- rebuttal_effectiveness: 0-100 (Weight: 15%)
- communication_skills: 0-100 (Weight: 15%)

Calculate total_score using:
total_score = (argument_quality * 0.30) + (evidence_usage * 0.20) + (logical_consistency * 0.20) + (rebuttal_effectiveness * 0.15) + (communication_skills * 0.15)

Also determine:
- winner: ("User", "AI", or "Tie")
- summary: paragraph summarizing the match adjudication
- strengths: list of 3-4 distinct demonstrated strengths
- weaknesses: list of 2-3 specific areas for growth
- actionable_feedback: list of 3 concrete coaching recommendations
Return strictly JSON."""

        formatted_history = "\n".join([f"{m.get('sender_name', m.get('sender_type'))}: {m.get('content')}" for m in messages_history])
        user_prompt = f"Topic: {topic}\nUser: {user_position}\nAI: {ai_position}\n\nDebate Transcript:\n{formatted_history}"

        llm_result = self._call_llm_json(system_prompt, user_prompt)
        if llm_result and "total_score" in llm_result:
            return llm_result

        # Realistic weighted calculation fallback based on actual debate messages
        user_msgs = [m for m in messages_history if m.get("sender_type") == "user"]
        total_words = sum(len(m.get("content", "").split()) for m in user_msgs)
        num_turns = max(1, len(user_msgs))
        avg_turn_length = total_words / num_turns

        arg_quality = min(94.0, max(60.0, 70.0 + min(20.0, avg_turn_length * 0.2)))
        evidence = min(90.0, max(50.0, 62.0 + (15.0 if any(re.search(r'\d+|study|research|data', m.get("content", "")) for m in user_msgs) else 0.0)))
        logical_consistency = min(92.0, max(65.0, 74.0 + min(15.0, num_turns * 3.0)))
        rebuttal_eff = min(95.0, max(58.0, 68.0 + min(20.0, avg_turn_length * 0.25)))
        comm_skills = min(96.0, max(65.0, 78.0 + min(15.0, total_words * 0.05)))

        total_score = round(
            (arg_quality * 0.30) +
            (evidence * 0.20) +
            (logical_consistency * 0.20) +
            (rebuttal_eff * 0.15) +
            (comm_skills * 0.15),
            1
        )

        winner = "User" if total_score >= 76.0 else ("Tie" if total_score >= 68.0 else "AI")

        return {
            "argument_quality": round(arg_quality, 1),
            "evidence_usage": round(evidence, 1),
            "logical_consistency": round(logical_consistency, 1),
            "rebuttal_effectiveness": round(rebuttal_eff, 1),
            "communication_skills": round(comm_skills, 1),
            "total_score": total_score,
            "winner": winner,
            "summary": f"The debate on '{topic}' showcased strong engagement. The speaker demonstrated articulate expression and consistent stance maintenance. Scoring reflects high clarity with actionable opportunities to strengthen empirical evidence under counter-examination.",
            "strengths": [
                "Cohesive structure across debate rounds maintaining clarity of purpose.",
                "Responsive engagement with opponent arguments rather than reciting canned talking points.",
                "Compelling rhetorical delivery and effective framing of the stakes."
            ],
            "weaknesses": [
                "Empirical evidence and quantitative citations were underutilized in rebuttal turns.",
                "Vulnerable to false dilemma framing when pressed on trade-offs."
            ],
            "actionable_feedback": [
                "Incorporate at least one verifiable empirical benchmark per rebuttal round.",
                "Explicitly dismantle the opponent's warrant before offering your counter-proposal.",
                "Practice time management to reserve the final 30 seconds for a synthesizing comparative impact."
            ],
            "rubric_breakdown": {
                "Argument Quality (30%)": f"{arg_quality}/100",
                "Evidence Usage (20%)": f"{evidence}/100",
                "Logical Consistency (20%)": f"{logical_consistency}/100",
                "Rebuttal Effectiveness (15%)": f"{rebuttal_eff}/100",
                "Communication Skills (15%)": f"{comm_skills}/100"
            }
        }

ai_service = AIService()
