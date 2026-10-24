# Local development commands. Run `make api` and `make web` in two terminals.
.PHONY: sync api web test e2e eval-laya eval-laya-holdout build

sync:
	cd ai-backend && uv sync --extra laya
	cd web && npm install

api:
	cd ai-backend && uv run --extra laya uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

web:
	cd web && npm run dev

test:
	cd ai-backend && uv run pytest
	cd web && npx tsc -b

e2e:
	cd web && npm run test:e2e

eval-laya:
	cd ai-backend && uv run python evals/evaluate_laya.py

eval-laya-holdout:
	cd ai-backend && uv run python evals/evaluate_laya.py --data evals/laya_holdout.jsonl

build:
	cd web && npm run build
