"""
Comprehensive Collegiate Logical Fallacy Catalog for DebateIQ.
Contains 22 formal and informal fallacies categorized by logical structure,
with collegiate examples, refutation strategies, and correction templates.
"""

from typing import List, Dict, Optional

FALLACIES_DATA: List[Dict] = [
    {
        "slug": "ad-hominem",
        "name": "Ad Hominem (Personal Attack)",
        "latin_name": "Argumentum Ad Hominem",
        "category": "Relevance & Personal",
        "severity": "Major Flaw",
        "short_definition": "Attacking an opponent's character, motive, or background rather than refuting their substantive argument.",
        "detailed_explanation": "An ad hominem bypasses the validity of the premise or empirical data by targeting the person speaking. Even if a speaker has dubious motives or flaws, their deductive or statistical assertions remain independent of their personal attributes.",
        "collegiate_example": "My opponent advocates for expanding nuclear power subsidies, but we cannot trust this proposal because their father worked as an executive for an energy conglomerate.",
        "refutation_strategy": "Point out the disconnect between character and validity: 'Whether the speaker's background is related or not, the empirical data on reactor safety stands on its own merits. The opposing team must refute the reactor safety statistics, not the speaker's biography.'",
        "correction_template": "Focus exclusively on the factual claim: 'While financial interests merit disclosure, the core question is whether Levelized Cost of Electricity (LCOE) metrics demonstrate net economic feasibility.'"
    },
    {
        "slug": "straw-man",
        "name": "Straw Man Fallacy",
        "latin_name": "Argumentum Ad Ignorantiam (Distortion)",
        "category": "Relevance & Personal",
        "severity": "Major Flaw",
        "short_definition": "Misrepresenting, exaggerating, or oversimplifying an opponent's argument to make it easier to attack.",
        "detailed_explanation": "By attacking a radicalized, cartoonish caricature of the opponent's true proposition, the debater creates an illusion of victory while ignoring the core nuanced argument actually put forward.",
        "collegiate_example": "The Affirmative wants to increase regulation on algorithmic trading systems. Clearly, they want the government to micromanage every private investment portfolio and eliminate free-market innovation altogether.",
        "refutation_strategy": "Directly cite your original qualification: 'We never advocated micromanaging individual portfolios; we specifically proposed mandatory latency pauses on high-frequency arbitrage algorithms. You are arguing against a policy we never introduced.'",
        "correction_template": "Accurately address the bounded scope: 'The specific proposed mandate on high-frequency trading latency creates unintended compliance overhead that slows market liquidity.'"
    },
    {
        "slug": "false-dilemma",
        "name": "False Dilemma / Bifurcation",
        "latin_name": "Fallacia Ficti Dilematis",
        "category": "Presumption & Circularity",
        "severity": "Major Flaw",
        "short_definition": "Presenting only two mutually exclusive alternatives when viable middle-ground or alternative solutions exist.",
        "detailed_explanation": "Reduces a complex spectrum of policy choices to an artificial binary: 'Either we adopt this extreme measure, or total catastrophe will ensue.' This ignores mixed models, phased rollouts, and third alternatives.",
        "collegiate_example": "Either we implement blanket biometric surveillance in all public facilities immediately, or we surrender any expectation of public security against coordinated threats.",
        "refutation_strategy": "Identify viable third options: 'This is an artificial dichotomy. Security infrastructure routinely combines targeted human intelligence, risk-based perimeter audits, and data minimization without resorting to universal biometric tracking.'",
        "correction_template": "Frame as a weighted trade-off with continuous variables: 'Biometric deployment exists on an operational continuum; we must calibrate accuracy thresholds against civil liberty protections.'"
    },
    {
        "slug": "slippery-slope",
        "name": "Slippery Slope",
        "latin_name": "Argumentum in Praeceps",
        "category": "Causal & Inductive",
        "severity": "Moderate Bias",
        "short_definition": "Asserting that a relatively modest initial action will inevitably trigger a catastrophic chain of events without proving intermediate links.",
        "detailed_explanation": "Assumes deterministic domino effects. While compound events can happen, each progressive link in the causal chain carries an independent probability that must be mathematically or empirically substantiated.",
        "collegiate_example": "If the university permits pass/fail grading for first-year seminars, professors will stop holding rigorous exams, grade inflation will destroy academic standards, and employers will stop hiring our graduates.",
        "refutation_strategy": "Break the causal chain at link one: 'Each step in this hypothetical chain requires its own independent institutional failure. You have shown no evidence that optional grading in introductory seminars forces upper-level capstone courses to abandon evaluation.'",
        "correction_template": "Prove empirical likelihoods for specific thresholds: 'Empirical data from peer universities indicates that unrestricted pass/fail policies correlate with a 7% reduction in graduate school admission competitiveness unless restricted to introductory semesters.'"
    },
    {
        "slug": "begging-the-question",
        "name": "Begging the Question (Petitio Principii)",
        "latin_name": "Petitio Principii",
        "category": "Presumption & Circularity",
        "severity": "Major Flaw",
        "short_definition": "An argument where the premise assumes the truth of the conclusion it aims to prove.",
        "detailed_explanation": "Circular argumentation where the justification offered for a statement is simply a rephrased restatement of the statement itself, offering zero external corroborating proof.",
        "collegiate_example": "Unrestricted free market deregulation is inherently optimal because economic liberty always yields superior macroeconomic outcomes.",
        "refutation_strategy": "Highlight the tautology: 'Saying deregulation is optimal because market freedom is superior is merely restating your conclusion using synonyms. What empirical GDP or consumer surplus metrics substantiate this?'",
        "correction_template": "Provide an external empirical premise: 'Deregulation in the telecommunications sector reduced average consumer broadband costs by 18% over four years following the 1996 Act.'"
    },
    {
        "slug": "post-hoc",
        "name": "Post Hoc Ergo Propter Hoc (False Cause)",
        "latin_name": "Post Hoc Ergo Propter Hoc",
        "category": "Causal & Inductive",
        "severity": "Major Flaw",
        "short_definition": "Asserting that because Event B occurred chronologically after Event A, Event A must have caused Event B.",
        "detailed_explanation": "Chronological precedence is a necessary condition for causation, but not a sufficient one. Confounding variables, reverse causality, and secular trends frequently account for the observed outcome.",
        "collegiate_example": "Immediately after the city instituted the municipal soda tax, regional cardiovascular incidents dropped by 4%. Therefore, the soda tax saved lives.",
        "refutation_strategy": "Introduce confounding factors and counterfactual controls: 'Correlation over time does not equal causation. During that same window, the county opened two specialized cardiac clinics and expanded Medicaid enrollment. Did you isolate for these confounding variables?'",
        "correction_template": "Use econometric controls or difference-in-differences analysis: 'A difference-in-differences study controlling for neighbouring counties without the tax demonstrated a statistically significant 1.8% decline attributable directly to reduced sugar intake.'"
    },
    {
        "slug": "red-herring",
        "name": "Red Herring (Distraction)",
        "latin_name": "Ignoratio Elenchi",
        "category": "Relevance & Personal",
        "severity": "Moderate Bias",
        "short_definition": "Introducing an irrelevant topic into the debate to divert attention away from the original unresolved issue.",
        "detailed_explanation": "The speaker shifts the argumentative vector toward an emotionally evocative or easily winnable topic, creating a rhetorical smokescreen while abandoning the burden of proof.",
        "collegiate_example": "We should not worry about the fiscal solvency of public transport subsidies when thousands of foreign workers are facing unjust immigration backlogs in our consulates.",
        "refutation_strategy": "Re-anchor the debate: 'Immigration consular delays are a pressing moral issue, but they do not resolve the municipal transit budget deficit under debate today. Let us return to transit funding mechanisms.'",
        "correction_template": "Acknowledge the tangent and cleanly re-center: 'While structural equity in governance affects all municipal services, we must first determine if transit fares cover operating expenses.'"
    },
    {
        "slug": "bandwagon",
        "name": "Bandwagon (Appeal to Popularity)",
        "latin_name": "Argumentum Ad Populum",
        "category": "Relevance & Personal",
        "severity": "Moderate Bias",
        "short_definition": "Arguing that a claim must be true or a policy sound because the majority of people believe or support it.",
        "detailed_explanation": "Popular consensus reflects cultural attitudes, not scientific or logical validity. Widespread historical beliefs have frequently proven demonstrably false upon empirical scrutiny.",
        "collegiate_example": "Over 78% of registered voters favor implementing rent control immediately; therefore, rent control is sound macroeconomic policy.",
        "refutation_strategy": "Separate popularity from operational efficacy: 'Public enthusiasm does not supersede economic mechanics. A policy can be universally popular while simultaneously choking new housing construction and raising equilibrium rents.'",
        "correction_template": "Ground in verifiable outcome data: 'Although public demand for affordability is paramount, economic surveys from the American Economic Review demonstrate that rent ceilings reduce long-term rental housing supply by up to 15%.'"
    },
    {
        "slug": "equivocation",
        "name": "Equivocation (Semantic Shift)",
        "latin_name": "Fallacia Aequivocationis",
        "category": "Ambiguity & Semantics",
        "severity": "Moderate Bias",
        "short_definition": "Using a single term with multiple meanings in different parts of an argument to create a deceptive syllogism.",
        "detailed_explanation": "Exploits lexical ambiguity where the premises interpret a word in sense X, but the conclusion hinges on sense Y.",
        "collegiate_example": "A company has a duty to look after its workers. What is a duty if not a legal obligation? Therefore, corporate management can be criminally prosecuted for failing to maximize employee happiness.",
        "refutation_strategy": "Disambiguate the term: 'You have conflated a moral or organizational duty with a statutory penal duty. Tort law defines criminal obligations strictly, not through aspirational moral concepts.'",
        "correction_template": "Maintain consistent operational definitions: 'While corporations maintain fiduciary ethical responsibilities toward employee retention, statutory liability is governed strictly by OSHA workplace standards.'"
    },
    {
        "slug": "hasty-generalization",
        "name": "Hasty Generalization",
        "latin_name": "Fallacia Accidentis / Secundum Quid",
        "category": "Causal & Inductive",
        "severity": "Major Flaw",
        "short_definition": "Drawing a broad, universal conclusion based on an unrepresentative or statistically inadequate sample size.",
        "detailed_explanation": "Inductive reasoning requires a sample size that is statistically representative, randomized, and sufficiently powered. Generalizing an entire demographic from an anecdotal instance invalidates the inference.",
        "collegiate_example": "My cousin opened a small bookstore last year and went bankrupt within six months. This proves that independent physical retail stores have zero economic viability in today's economy.",
        "refutation_strategy": "Expose sample inadequacy: 'An n=1 anecdote from a single location with unknown capital conditions does not represent the macro-retail ecosystem. What do nationwide census retail survival curves show?'",
        "correction_template": "Cite statistically powered aggregate studies: 'According to the Small Business Administration, 50% of independent retail businesses survive beyond five years, with location and inventory turn-rate serving as primary predictive coefficients.'"
    },
    {
        "slug": "appeal-to-authority",
        "name": "Appeal to Unqualified Authority",
        "latin_name": "Argumentum Ad Verecundiam",
        "category": "Authority & Emotion",
        "severity": "Moderate Bias",
        "short_definition": "Citing an individual of general prominence or authority in an unrelated field to substantiate a specialized claim.",
        "detailed_explanation": "Expertise is domain-specific. A Nobel laureate in Theoretical Physics carries no intrinsic authority regarding monetary macroeconomics or immunology.",
        "collegiate_example": "Renowned quantum physicist Dr. Robert Sterling stated in an interview that human genetics precludes any possibility of world peace. Therefore, diplomatic treaties are futile.",
        "refutation_strategy": "Isolate peer consensus and domain relevance: 'Dr. Sterling is a distinguished physicist, not an evolutionary biologist or diplomatic historian. We must look at peer-reviewed international relations scholarship, not casual quotes outside his discipline.'",
        "correction_template": "Cite domain-specific peer-reviewed consensus: 'Empirical datasets compiled by the Peace Research Institute Oslo (PRIO) demonstrate a 60% decline in interstate armed conflicts since 1946 following multilateral security pacts.'"
    },
    {
        "slug": "appeal-to-emotion",
        "name": "Appeal to Emotion / Fearmongering",
        "latin_name": "Argumentum Ad Passiones",
        "category": "Authority & Emotion",
        "severity": "Major Flaw",
        "short_definition": "Manipulating emotional responses (fear, pity, outrage, sentimentality) in place of valid logical reasoning and evidence.",
        "detailed_explanation": "Rhetorical emotion is powerful in debate, but when it replaces rather than illustrates a logical premise, the argument loses validity. Moral urgency cannot substitute for causal efficacy.",
        "collegiate_example": "Think of the innocent children who will shed tears every night if we do not approve this municipal zoning variance for our community park!",
        "refutation_strategy": "Acknowledge the emotional weight while demanding the underlying balance: 'We all care deeply about childhood well-being, but emotional appeals cannot balance municipal balance sheets. What is the structural cost and environmental impact of the zoning variance?'",
        "correction_template": "Combine human impact with systematic evidence: 'Access to urban green spaces correlates with a 14% reduction in childhood stress markers (Journal of Environmental Psychology), providing measurable civic benefits alongside aesthetic enrichment.'"
    },
    {
        "slug": "tu-quoque",
        "name": "Tu Quoque (Whataboutism / You Too)",
        "latin_name": "Tu Quoque",
        "category": "Relevance & Personal",
        "severity": "Moderate Bias",
        "short_definition": "Deflecting criticism of an argument or action by alleging hypocrisy in the opponent.",
        "detailed_explanation": "Whether an opponent has failed to uphold their own standard does not disprove the validity of the standard. Hypocrisy on the part of the advocate is logically irrelevant to the truth of the proposition.",
        "collegiate_example": "Why should our nation limit carbon emissions when the Opposition's allied nations expanded coal extraction five years ago?",
        "refutation_strategy": "Reject the deflection: 'Past inconsistencies or violations by other parties do not alter the atmospheric chemistry of global warming. The question is whether our proposed policy produces net mitigation, not what another government did half a decade ago.'",
        "correction_template": "Address policy standards reciprocally: 'While global compliance parity is essential for long-term effectiveness, our domestic border carbon adjustments ensure that we do not suffer unilateral competitive disadvantages.'"
    },
    {
        "slug": "circular-reasoning",
        "name": "Circular Reasoning",
        "latin_name": "Circulus in Demonstrando",
        "category": "Presumption & Circularity",
        "severity": "Major Flaw",
        "short_definition": "Reasoning where the conclusion is assumed in one of the premises, creating a closed loop without external validation.",
        "detailed_explanation": "A is true because B is true; B is true because A is true. The chain of proof contains zero external epistemological anchors.",
        "collegiate_example": "The law is just because it was enacted by a legitimate legislature, and we know the legislature is legitimate because it enforces just laws.",
        "refutation_strategy": "Expose the recursive loop: 'Your premise and conclusion rely on each other for legitimacy without introducing any external benchmark such as constitutional fidelity, voter franchise, or human rights standards.'",
        "correction_template": "Anchor the standard in independent normative or legal benchmarks: 'The legislative mandate is legitimate because it satisfied procedural supermajority voting thresholds and withstands judicial review under constitutional due process.'"
    },
    {
        "slug": "composition-division",
        "name": "Composition & Division Fallacy",
        "latin_name": "Fallacia Compositionis / Divisionis",
        "category": "Ambiguity & Semantics",
        "severity": "Moderate Bias",
        "short_definition": "Inferring that what is true of a part must be true of the whole (Composition), or that what is true of the whole must be true of every individual part (Division).",
        "detailed_explanation": "Complex emergent systems possess properties that cannot be deduced from isolated parts. Conversely, systemic aggregates do not confer their averages onto every constituent member.",
        "collegiate_example": "Every member of this university debate team is the top-ranked individual orator in their district. Therefore, this team will effortlessly win the National Parliamentary Championship.",
        "refutation_strategy": "Distinguish between aggregate properties and individual traits: 'Individual speaking talent does not automatically translate into cohesive team coordination, prep room collaboration, or cross-examination chemistry. Emergent team dynamics matter.'",
        "correction_template": "Account for interaction effects and emergent properties: 'While individual speaker points provide strong baseline capability, team success requires demonstrated synergy in cross-case rebuttals and rebuttal division.'"
    },
    {
        "slug": "false-analogy",
        "name": "False Analogy",
        "latin_name": "Fallacia Analogiae",
        "category": "Ambiguity & Semantics",
        "severity": "Moderate Bias",
        "short_definition": "Comparing two situations that have superficial similarities while ignoring critical, decisive differences.",
        "detailed_explanation": "Analogies illustrate; they do not prove. If the differences between Entity A and Entity B outnumber or outweigh the relevant similarities, inductive conclusions drawn from the comparison collapse.",
        "collegiate_example": "Running a sovereign nation's monetary system is just like managing a household checkbook; if a family cannot run perpetual deficits without bankruptcy, a government cannot either.",
        "refutation_strategy": "Pinpoint the structural divergence: 'A household does not issue its own sovereign currency, cannot levy taxes on millions of citizens, and does not operate over generational time horizons. The analogy breaks down at every macroeconomic level.'",
        "correction_template": "Compare strictly equivalent economic units: 'Unlike sovereign fiat issuers, sub-national municipal governments operate under balanced-budget constraints that closely mirror corporate cash-flow solvency requirements.'"
    },
    {
        "slug": "texas-sharpshooter",
        "name": "Texas Sharpshooter (Cherry Picking)",
        "latin_name": "Fallacia Selectionis",
        "category": "Causal & Inductive",
        "severity": "Major Flaw",
        "short_definition": "Selecting only the data points that favor a hypothesis while systematically ignoring contrary clusters of evidence.",
        "detailed_explanation": "Derived from the fable of a gunman shooting holes into a barn wall and then painting targets centered on the bullet clusters. It fabricates statistical significance by suppressing non-confirming outcomes.",
        "collegiate_example": "Our youth outreach initiative was a resounding triumph: attendance in our downtown robotics workshop surged by 300%!",
        "refutation_strategy": "Demand full dataset transparency: 'You cited one robotics workshop while ignoring that overall city-wide youth civic engagement declined across 14 other community centers. What is the net average across all programs?'",
        "correction_template": "Report systematic meta-analyses and weighted averages: 'Across all 15 municipal youth centers, aggregate attendance increased by an average of 4.2% (p < 0.05), driven primarily by STEM workshops.'"
    },
    {
        "slug": "appeal-to-ignorance",
        "name": "Appeal to Ignorance (Burden of Proof)",
        "latin_name": "Argumentum Ad Ignorantiam",
        "category": "Authority & Emotion",
        "severity": "Major Flaw",
        "short_definition": "Claiming that a proposition is true simply because it has not yet been proven false, or false because it has not been proven true.",
        "detailed_explanation": "Absence of evidence is not evidence of absence. The philosophical burden of proof lies squarely upon the advocate asserting the affirmative proposition.",
        "collegiate_example": "Nobody has ever definitively proven that algorithmic hiring tools contain racial bias in our specific industry; therefore, our automated hiring pipeline is completely unbiased.",
        "refutation_strategy": "Enforce the affirmative burden of proof: 'Lack of an external audit does not prove fairness. If you assert your algorithm is equitable, you bear the burden of producing an independent disparate impact assessment.'",
        "correction_template": "Establish positive empirical validation: 'Internal bias audits conducted across 12,000 resume evaluations demonstrated equal distribution curves across demographic percentiles.'"
    },
    {
        "slug": "genetic-fallacy",
        "name": "Genetic Fallacy",
        "latin_name": "Fallacia Originis",
        "category": "Relevance & Personal",
        "severity": "Moderate Bias",
        "short_definition": "Judging the validity of an idea solely based on its origins, history, or who first conceived it, rather than its present merits.",
        "detailed_explanation": "The historical context in which an idea originated is distinct from its logical correctness or modern operational efficacy. Good ideas can come from flawed historical contexts.",
        "collegiate_example": "We should reject synthetic fertilizer technology because early research into nitrogen fixation was heavily funded by early 20th-century wartime munitions manufacturers.",
        "refutation_strategy": "Separate provenance from functional utility: 'The wartime origins of nitrogen chemistry do not change the fact that Haber-Bosch synthetic nitrogen feeds nearly half of the modern global population with verifiable caloric output.'",
        "correction_template": "Evaluate current environmental and nutritional efficacy: 'Modern agricultural nitrogen use should be calibrated based on run-off eutrophication metrics rather than historical origin stories.'"
    },
    {
        "slug": "sunk-cost",
        "name": "Sunk Cost Fallacy",
        "latin_name": "Concorde Fallacy",
        "category": "Presumption & Circularity",
        "severity": "Moderate Bias",
        "short_definition": "Continuing an unsuccessful policy or venture simply because significant unrecoverable resources have already been invested.",
        "detailed_explanation": "Rational policy decisions must be evaluated forward-looking on marginal benefit versus marginal cost. Past expenditures are gone and cannot be recovered regardless of future decisions.",
        "collegiate_example": "We have already invested $400 million and six years building this light rail segment; we cannot cancel it now, even if ridership forecasts have collapsed by 80%.",
        "refutation_strategy": "Demonstrate forward marginal utility: 'The $400 million is already spent and unrecoverable. The question now is whether the next $200 million will generate more value in transit or if it should be redirected to high-frequency bus networks with immediate demand.'",
        "correction_template": "Analyze marginal forward-looking ROI: 'A forward-looking marginal cost-benefit analysis indicates that terminating the track and deploying autonomous rapid-transit buses delivers 3x the passenger capacity per future dollar invested.'"
    },
    {
        "slug": "affirming-consequent",
        "name": "Affirming the Consequent",
        "latin_name": "Affirmatio Consequentis",
        "category": "Formal Deductive",
        "severity": "Major Flaw",
        "short_definition": "A formal deductive error taking the conditional statement 'If P, then Q', observing Q, and incorrectly deducing that P must be true.",
        "detailed_explanation": "In formal propositional logic: P -> Q does not imply Q -> P. Multiple alternative causes could have produced the observed consequent Q.",
        "collegiate_example": "If a government is authoritarian, it restricts public protests. This country just restricted a rowdy midnight public protest; therefore, this country is an authoritarian dictatorship.",
        "refutation_strategy": "Present alternative antecedent conditions: 'P implies Q does not mean Q implies P. Democratic nations frequently enforce standard municipal curfew regulations and noise ordinances without being authoritarian regimes.'",
        "correction_template": "Formulate a valid modus ponens or probabilistic model: 'Authoritarian governance is characterized by systematic suppression of opposition parties and extrajudicial detention, which are absent from this municipal curfew incident.'"
    },
    {
        "slug": "denying-antecedent",
        "name": "Denying the Antecedent",
        "latin_name": "Negatio Antecedentis",
        "category": "Formal Deductive",
        "severity": "Major Flaw",
        "short_definition": "A formal deductive error taking the conditional statement 'If P, then Q', observing not-P, and incorrectly concluding not-Q.",
        "detailed_explanation": "In formal propositional logic: P -> Q does not mean ~P -> ~Q. The consequent Q could still occur via different pathways or mechanisms.",
        "collegiate_example": "If we build a new high-speed rail line, intercity travel times will decrease. We decided not to build high-speed rail; therefore, intercity travel times can never decrease.",
        "refutation_strategy": "Identify alternative paths to the consequent: 'Denying the antecedent is formally invalid. Intercity travel times can decrease through airport modernization, autonomous highway platooning, or improved regional express bus corridors.'",
        "correction_template": "Model multi-pathway infrastructure solutions: 'While high-speed rail offers the most significant single-corridor time savings, alternative investments in air-traffic navigation modernization achieve comparable reductions on regional trunk routes.'"
    }
]

def get_all_fallacies(category: Optional[str] = None, search: Optional[str] = None) -> List[Dict]:
    results = FALLACIES_DATA
    if category and category.lower() != 'all':
        cat_lower = category.lower()
        results = [f for f in results if cat_lower in f['category'].lower()]
    if search:
        s_lower = search.lower().strip()
        results = [
            f for f in results
            if s_lower in f['name'].lower()
            or s_lower in f['latin_name'].lower()
            or s_lower in f['short_definition'].lower()
            or s_lower in f['slug'].lower()
        ]
    return results

def get_fallacy_by_slug(slug: str) -> Optional[Dict]:
    target = slug.strip().lower()
    for f in FALLACIES_DATA:
        if f['slug'].lower() == target:
            return f
    return None
