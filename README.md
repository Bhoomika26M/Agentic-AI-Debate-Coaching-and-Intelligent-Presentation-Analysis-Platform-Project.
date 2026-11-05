
# VerbalArena

VerbalArena is an agentic AI debate coaching and presentation analysis platform
implemented with Next.js, TypeScript, and Tailwind CSS. It supports learner,
coach, educator, and administrator workspaces.

## Included workflows

- Multi-format debate simulation: one-on-one, parliamentary, Oxford, policy,
  public forum, and AI simulation.
- Argument mining: claim extraction, evidence signals, five-factor scoring,
  strengths, weaknesses, and coaching advice.
- Detection and explanation of eight logical fallacies.
- Five rebuttal strategies with challenge questions and implementation tips.
- Presentation analytics for pace, fillers, confidence, clarity,
  engagement, ethos/pathos/logos, and fallacies.
- Weighted debate scorecards and adaptive coaching plans.
- Role-specific dashboards, browser speech recognition, and report export.
- Built-in offline simulator plus optional Google, OpenAI, Anthropic, and
  DeepSeek debate providers.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The built-in simulator requires no credentials.
Use the model settings button to select a provider and save its API key in
browser storage. A provider request is made only when a key is present;
otherwise debate practice remains fully offline.

## Validate and deploy

```powershell
npm run build
docker build -t verbalarena .
docker run --rm -p 3000:3000 verbalarena
```

The API routes are:

| Route | Purpose |
| --- | --- |
| `POST /api/arguments` | Analyze claims, evidence, scores, and fallacies |
| `POST /api/debate` | Generate an offline or provider-backed debate turn |
| `POST /api/fallacies` | Detect and explain logical fallacies |
| `POST /api/rebuttal` | Generate counterargument options |
| `POST /api/presentation` | Analyze presentation transcript metrics |
| `POST /api/coaching` | Generate a personalized coaching plan |

This repository uses browser-local profiles and role workspaces for the
demonstration environment. Production deployments should put authentication,
provider keys, persistence, rate limiting, and audit logging behind a trusted
server-side identity and secrets manager.
