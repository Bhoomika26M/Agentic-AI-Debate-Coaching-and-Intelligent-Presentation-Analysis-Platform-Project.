import asyncio
from typing import Dict, Any, List
from backend.app.agents.topic_agent import topic_agent
from backend.app.agents.argument_agent import argument_agent
from backend.app.agents.fallacy_agent import fallacy_agent
from backend.app.agents.counterargument_agent import counterargument_agent
from backend.app.agents.challenge_agent import challenge_agent
from backend.app.agents.coach_agent import coach_agent
from backend.app.agents.scoring_agent import scoring_agent
from backend.app.ai.llm_client import llm_client

class DebateOrchestrator:
    """Multi-Agent Orchestrator: Coordinates all 7 agents in a structured, multi-turn debate workflow."""

    async def process_user_turn(
        self,
        topic: str,
        user_position: str,
        format_type: str,
        difficulty: str,
        personality: str,
        user_argument: str,
        round_number: int,
        conversation_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        # Run Argument analysis, Fallacy detection, and Topic analysis in parallel
        argument_task = asyncio.create_task(argument_agent.analyze_argument(user_argument, topic, user_position))
        fallacy_task = asyncio.create_task(fallacy_agent.detect_fallacies(user_argument))
        topic_task = asyncio.create_task(topic_agent.analyze_topic(topic, user_position, format_type))

        analysis, fallacies, topic_context = await asyncio.gather(argument_task, fallacy_task, topic_task)

        # Run Counterargument, Challenge, and Coaching generation
        counter_task = asyncio.create_task(counterargument_agent.generate_counterarguments(user_argument, topic, user_position))
        challenge_task = asyncio.create_task(challenge_agent.generate_challenges(user_argument, topic, difficulty))
        coach_task = asyncio.create_task(coach_agent.generate_coaching(user_argument, topic, fallacies, analysis))

        counterarguments, challenges, coaching = await asyncio.gather(counter_task, challenge_task, coach_task)

        # Calculate exact weighted score
        word_count = len(user_argument.split())
        score_breakdown = scoring_agent.calculate_round_score(analysis, len(fallacies), word_count, personality)

        # Generate AI Opponent response speech tailored to personality
        ai_response = await self._generate_ai_opponent_speech(
            topic=topic,
            user_position=user_position,
            personality=personality,
            user_argument=user_argument,
            counterarguments=counterarguments,
            challenges=challenges,
            round_number=round_number
        )

        return {
            "ai_transcript": ai_response,
            "argument_analysis": analysis,
            "fallacies": fallacies,
            "counterarguments": counterarguments,
            "challenges": challenges,
            "coaching": coaching,
            "score": score_breakdown,
            "topic_context": topic_context
        }

    async def generate_opening_argument(
        self,
        topic: str,
        user_position: str,
        personality: str,
        format_type: str
    ) -> str:
        ai_position = "Against" if "for" in user_position.lower() else "For"
        
        prompt = f"""You are the opposing debater in a {format_type} debate.
Topic: "{topic}"
Your position: {ai_position}
Your personality: {personality} (e.g. Analytical, Aggressive, Socratic, Friendly, Evidence-focused, Skeptical).

Generate a compelling, articulate opening speech (120-180 words) laying out your core framework and thesis. Embody your personality style completely.
"""
        opening = await llm_client.generate_completion(prompt)
        if opening:
            return opening.strip()

        # Deterministic opening speech
        tones = {
            "Friendly": f"Welcome to today's debate on whether {topic.lower()}. While I genuinely respect the merits of your stance, my goal today is to illuminate the nuanced unintended consequences that a full adoption creates.",
            "Analytical": f"Let us dissect the motion before us: {topic}. In evaluating this resolution, we must scrutinize empirical data, causal mechanisms, and structural trade-offs. The evidence clearly dictates that my stance as {ai_position} produces superior systemic stability.",
            "Aggressive": f"The assertion that {topic.lower()} is fundamentally flawed and untenable. Throughout this debate, I will prove that my opponent's position ignores catastrophic economic and operational liabilities.",
            "Skeptical": f"Extraordinary claims require extraordinary evidence. Regarding whether {topic.lower()}, the supporting premises rely far too heavily on speculative optimism rather than reproducible empirical reality.",
            "Evidence-focused": f"According to contemporary macroeconomic data and longitudinal peer-reviewed studies, taking the position {ai_position} on {topic.lower()} is corroborated by overwhelming empirical consensus.",
            "Socratic": f"Before we accept the resolution regarding {topic.lower()}, we must ask: by what standard do we measure success, and what fundamental rights or efficiencies are we willing to compromise?"
        }
        return tones.get(personality, tones["Analytical"])

    async def _generate_ai_opponent_speech(
        self,
        topic: str,
        user_position: str,
        personality: str,
        user_argument: str,
        counterarguments: Dict[str, Any],
        challenges: Dict[str, Any],
        round_number: int
    ) -> str:
        prompt = f"""You are an opposing debater in Round {round_number} on: "{topic}".
Your debater personality: {personality}
User argued: "{user_argument}"
Key rebuttals available:
- Logical: {counterarguments.get('logical_rebuttal')}
- Evidence: {counterarguments.get('evidence_rebuttal')}
- Practical: {counterarguments.get('practical_rebuttal')}
Challenge question: {challenges.get('socratic_question')}

Deliver a pointed rebuttal speech (100-150 words) directly attacking the user's argument, incorporating your personality tone, and ending with a sharp challenge question.
"""
        response = await llm_client.generate_completion(prompt)
        if response:
            return response.strip()

        # High-fidelity deterministic response generator
        logical = counterarguments.get("logical_rebuttal", "")
        evidence = counterarguments.get("evidence_rebuttal", "")
        practical = counterarguments.get("practical_rebuttal", "")
        question = challenges.get("socratic_question", "How do you reconcile this premise with historical precedent?")

        if personality == "Aggressive":
            return f"That argument completely fails to account for the primary vulnerability! {logical} Furthermore, {practical} You cannot simply bypass these tangible liabilities. So answer me this: {question}"
        elif personality == "Socratic":
            return f"Consider the deeper implication of what you just stated. {logical} If we evaluate the real-world precedent, {evidence} This leads us to a crucial question: {question}"
        elif personality == "Evidence-focused":
            return f"The data does not support your conclusion. {evidence} Moreover, {practical} Until verifiable proof is provided for your primary contention, the motion cannot stand. Specifically: {question}"
        elif personality == "Friendly":
            return f"You raise an interesting perspective, and I appreciate the clarity of your point. However, looking at the structural dynamics, {logical} In addition, {practical} I encourage you to consider: {question}"
        elif personality == "Skeptical":
            return f"I remain unconvinced by that rationale. {logical} The assumption rests on unverified correlations. {evidence} Can you genuinely demonstrate: {question}"
        else: # Analytical
            return f"Deconstructing your contention reveals two fundamental flaws. First, {logical} Second, from an empirical perspective, {evidence} To maintain argumentative consistency, how do you address this: {question}"

orchestrator = DebateOrchestrator()
