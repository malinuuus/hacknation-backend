# Hacknation Backend

API Asystenta UDIP oparte na NestJS, Prisma i PostgreSQL (z rozszerzeniem pgvector).

## Wymagania

- **Node.js 24.22.1** (zob. [.nvmrc](.nvmrc)). Jeśli używasz nvm, uruchom `nvm use`.
- **pnpm**, instalowany przez Corepack: `corepack enable`
- **Docker** z Docker Compose, w którym działa lokalna baza PostgreSQL

## Uruchomienie lokalne

### 1. Instalacja zależności

```bash
pnpm install
```

Skrypt `postinstall` uruchamia `prisma generate`, który generuje klienta Prismy w `src/generated/prisma`.

### 2. Konfiguracja środowiska

```bash
cp .env.example .env
```

Domyślne wartości z `.env.example` wystarczą do pracy lokalnej. Warto zwrócić uwagę na:

| Zmienna                                 | Uwagi                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                            | Ustaw długi, losowy ciąg znaków: `openssl rand -base64 48`                                                                                         |
| `CORS_ORIGINS`                          | Adres frontendu (domyślnie `http://localhost:5173`)                                                                                                |
| `POSTGRES_PORT`                         | Zmień, jeśli port 5432 jest zajęty, i popraw port w `DATABASE_URL`                                                                                 |
| `OPENAI_API_KEY`                        | Opcjonalny. Bez klucza aplikacja działa bez AI: `/cases/analyze` korzysta z dopasowywania wzorców, a endpointy AI zwracają `503 AI_NOT_CONFIGURED` |
| `SEED_DEMO_EMAIL`, `SEED_DEMO_PASSWORD` | Opcjonalne. Dane logowania konta demo tworzonego przez `pnpm prisma:seed:demo`                                                                     |

### 3. Uruchomienie bazy danych

```bash
pnpm db:up
```

Polecenie uruchamia PostgreSQL 18 z pgvector (`docker-compose.local.yaml`) i czeka, aż baza będzie gotowa. Dane są przechowywane w wolumenie Dockera `hacknation-postgres-data`.

### 4. Migracje i dane początkowe

```bash
pnpm prisma:migrate     # zastosowanie migracji
pnpm prisma:seed        # dane słownikowe (wydziały); można uruchamiać wielokrotnie
```

Aby dodatkowo utworzyć użytkownika demo z 10 przykładowymi sprawami:

```bash
pnpm prisma:seed:demo
```

Jeśli nie ustawisz `SEED_DEMO_EMAIL` i `SEED_DEMO_PASSWORD`, konto demo to `urzednik@example.com` / `Bydgoszcz2026`.

### 5. Uruchomienie serwera

```bash
pnpm start:dev
```

API jest dostępne pod adresem `http://localhost:3000/api` (lub na porcie `PORT` z `.env`).
Przy `NODE_ENV=development` dokumentacja Swagger jest dostępna pod **http://localhost:3000/api/docs**.

Przesłane dokumenty są zapisywane w katalogu `storage/uploads` (`UPLOAD_DIR`).
