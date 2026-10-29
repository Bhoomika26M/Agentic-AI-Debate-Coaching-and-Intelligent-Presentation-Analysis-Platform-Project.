# Local development commands. Run `make api` and `make web` in two terminals.
.PHONY: sync sync-laya api api-laya web test e2e eval-laya eval-laya-holdout eval-fallacies build

sync:
	cd ai-backend && uv sync
	cd web && npm install

sync-laya:
	cd ai-backend && uv sync --extra laya

api:
	cd ai-backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

api-laya:
	cd ai-backend && ENABLE_LAYA_TACTICS=true uv run --extra laya uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

web:
	cd web && npm run dev

test:
	cd ai-backend && uv run pytest
	cd web && npx tsc -b

e2e:
	cd web && npm run test:e2e

eval-laya:
	cd ai-backend && ENABLE_LAYA_TACTICS=true uv run --extra laya python evals/evaluate_laya.py

eval-laya-holdout:
	cd ai-backend && ENABLE_LAYA_TACTICS=true uv run --extra laya python evals/evaluate_laya.py --data evals/laya_holdout.jsonl

eval-fallacies:
	cd ai-backend && uv run python evals/evaluate_fallacies.py

build:
	cd web && npm run build
