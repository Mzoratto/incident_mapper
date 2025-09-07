PNPM=pnpm

.PHONY: dev api web build lint db-up db-down migrate seed

dev: api web

api:
	$(PNPM) --filter @incident/api dev

web:
	$(PNPM) --filter @incident/web dev

build:
	$(PNPM) -w build

lint:
	$(PNPM) -w lint

db-up:
	docker compose -f infra/docker/compose.yml up -d

db-down:
	docker compose -f infra/docker/compose.yml down

migrate:
	$(PNPM) --filter @incident/api prisma:migrate

seed:
	$(PNPM) --filter @incident/api seed

