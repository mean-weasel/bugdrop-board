.PHONY: dev build build-widget build-all deploy deploy-development deploy-production deploy-check deploy-check-production deploy-smoke release-rehearsal test test-watch lint lint-fix format format-check typecheck knip audit check-actions-node24 check ci clean install help

dev:
	npm run dev

build:
	npm run build

build-widget:
	npm run build:widget

build-all: build-widget build

deploy: build-all
	npm run deploy

deploy-development:
	npm run deploy:development

deploy-production:
	npm run deploy:production

deploy-check:
	npm run deploy:check

deploy-check-production:
	npm run deploy:check:production

deploy-smoke:
	npm run deploy:smoke -- \
		$(if $(URL),--url "$(URL)",) \
		$(if $(EXPECT_ENVIRONMENT),--expect-environment "$(EXPECT_ENVIRONMENT)",) \
		$(if $(CORS_ORIGIN),--cors-origin "$(CORS_ORIGIN)",) \
		$(if $(CORS_BOARD_ID),--cors-board-id "$(CORS_BOARD_ID)",) \
		$(if $(CORS_TOKEN_ENDPOINT),--cors-token-endpoint "$(CORS_TOKEN_ENDPOINT)",)

release-rehearsal:
	npm run release:rehearsal

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
	@echo "  make deploy-development - deploy using top-level development Wrangler config"
	@echo "  make deploy-check-production - build widget and dry-run wrangler deploy --env production"
	@echo "  make deploy-production - build widget and deploy with wrangler --env production"
	@echo "  make deploy-smoke URL=https://worker.example.com EXPECT_ENVIRONMENT=production - verify /health and /board.js"
	@echo "                    add CORS_ORIGIN, CORS_BOARD_ID, and CORS_TOKEN_ENDPOINT to verify browser CORS"
	@echo "                    or use DEPLOY_SMOKE_URL, DEPLOY_SMOKE_EXPECT_ENVIRONMENT, and DEPLOY_SMOKE_CORS_*"
	@echo "  make release-rehearsal - run local release-readiness dry-run gates"
	@echo "  make build-all   - build widget and TypeScript"
	@echo "  make clean       - remove local build artifacts"
