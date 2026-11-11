# Bro Batch — common tasks. Run `make help` for the list.
SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

.PHONY: help setup lint typecheck format format-check test test-web db-test db-test-plain db-test-supabase build dev-admin check

help: ## Show this list
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install dependencies and enable the git hooks
	pnpm install --frozen-lockfile
	git config core.hooksPath .githooks

lint: ## Lint all TypeScript packages
	pnpm lint

typecheck: ## Type-check all TypeScript packages
	pnpm typecheck

format: ## Format files with Prettier
	pnpm format

format-check: ## Check formatting without changing files
	pnpm format:check

test-web: ## Unit tests for the contracts package and the admin app
	pnpm test

db-test-plain: ## Database tests on a plain PostgreSQL server with pgTAP (no Docker)
	scripts/db-test.sh

db-test-supabase: ## Database tests on the Supabase local stack (needs Docker)
	pnpm exec supabase db start
	pnpm exec supabase test db

db-test: ## Database tests, using whichever of the two setups is available
	@if command -v pg_prove >/dev/null 2>&1 && command -v psql >/dev/null 2>&1; then \
	  $(MAKE) --no-print-directory db-test-plain; \
	elif docker info >/dev/null 2>&1; then \
	  $(MAKE) --no-print-directory db-test-supabase; \
	else \
	  echo "error: database tests need either PostgreSQL with pgTAP, or Docker."; \
	  echo "       See docs/DATABASE.md, 'Running the tests'."; \
	  exit 2; \
	fi

test: test-web db-test ## Run every test suite

build: ## Production build of the admin app
	pnpm build

dev-admin: ## Run the admin app locally on http://127.0.0.1:3000
	pnpm --filter @brobatch/admin dev

check: format-check lint typecheck test build ## Everything CI runs
