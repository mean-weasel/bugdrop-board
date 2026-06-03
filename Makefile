.PHONY: dev build build-widget build-all deploy deploy-check test test-watch lint lint-fix format format-check typecheck knip audit check-actions-node24 check ci clean install help

dev:
	npm run dev

build:
	npm run build

build-widget:
	npm run build:widget

build-all: build-widget build

deploy: build-all
	npm run deploy

deploy-check:
	npm run deploy:check

test:
	npm run test

test-watch:
	npm run test:watch

lint:
	npx eslint .

lint-fix:
	npx eslint . --fix

format:
	npm run format

format-check:
	npm run format:check

typecheck:
	npm run typecheck

knip:
	npx knip

audit:
	npm audit --audit-level=critical

check-actions-node24:
	npm run check:actions-node24

check: lint format-check typecheck knip audit check-actions-node24
	@echo "✓ All checks passed"

ci: check test build-all
	@echo "✓ Scaffold CI passed"

clean:
	rm -rf dist node_modules/.cache .wrangler/tmp public/board.js

install:
	npm ci

help:
	@echo "Available commands:"
	@echo "  make check       - lint, format-check, typecheck, knip, audit, Actions guard"
	@echo "  make ci          - check, unit tests, widget build, TypeScript build"
	@echo "  make deploy-check - build widget and run wrangler deploy --dry-run"
	@echo "  make build-all   - build widget and TypeScript"
	@echo "  make clean       - remove local build artifacts"
