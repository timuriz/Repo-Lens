# Deploy RepoLens AI to Cloudflare Workers

Пошаговый гайд: из локального `npm run dev` → публичный URL на Cloudflare.

Цель деплоя: **Cloudflare Workers** (Nitro preset `cloudflare-module`). Vercel в текущем виде не подходит из‑за отсутствия постоянного диска под SQLite.

---

## Что уже подготовлено в репо

- Nitro включён явно → билд кладёт Worker в `dist/server/`
- Имя воркера: `repolens-ai`
- `nodejs_compat` включён
- SQLite L2 **опционален**: локально работает, на Workers тихо падает в memory-only L1
- Скрипты: `deploy`, `preview:worker`

---

## 0. Требования

- Node.js **22+**
- Аккаунт [Cloudflare](https://dash.cloudflare.com/) (бесплатного Workers Free хватит для демо)
- Ключ Gemini: https://aistudio.google.com/apikey
- Опционально: GitHub token (выше rate limit на tree)

```bash
node -v   # v22.x
npm install
npm test
npm run build
```

Если `npm run build` заканчивается строками `Generated dist/server/wrangler.json` — деплой-артефакты в порядке.

---

## 1. Логин в Cloudflare

```bash
npx wrangler login
```

Откроется браузер → разреши доступ Wrangler к аккаунту.

Проверка:

```bash
npx wrangler whoami
```

---

## 2. Секреты (один раз на worker)

Секреты привязаны к **имени** воркера `repolens-ai`, а не к файлу. После первого `build` выполни:

```bash
npm run build

# обязательный для AI-анализа
npx wrangler secret put GEMINI_API_KEY --config dist/server/wrangler.json
# вставь ключ и Enter

# опционально — меньше 403/rate-limit от GitHub
npx wrangler secret put GITHUB_TOKEN --config dist/server/wrangler.json
```

Локальная имитация Workers-окружения (без деплоя):

```bash
cp .dev.vars.example .dev.vars
# заполни GEMINI_API_KEY (и GITHUB_TOKEN) в .dev.vars
npm run preview:worker
```

`.dev.vars` уже в `.gitignore` — не коммить.

---

## 3. Деплой

```bash
npm run deploy
```

Это:

1. `vite build` + Nitro → `dist/server` + `dist/client`
2. `wrangler deploy --config dist/server/wrangler.json`

В конце Wrangler покажет URL вида:

```text
https://repolens-ai.<твой-subdomain>.workers.dev
```

Открой и проверь:

1. Главная: бренд + инпут
2. `/?repo=expressjs/cors` → дерево + header
3. Analyze → AI Brief / Risks / Contribute (нужен `GEMINI_API_KEY`)

---

## 4. Обновления после правок кода

```bash
npm run deploy
```

Секреты заново ставить **не нужно**, пока не меняешь имя воркера.

---

## 5. Кастомный домен (опционально)

В [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → `repolens-ai` → **Settings → Domains & Routes** → Add Custom Domain.

Или через CLI после привязки зоны к Cloudflare:

```bash
npx wrangler domains add your.domain.com --config dist/server/wrangler.json
```

(команда может отличаться в зависимости от версии Wrangler — смотри подсказку в dashboard.)

---

## 6. CI (опционально): GitHub Actions

Минимальный workflow после пуша в `main`:

1. В репо GitHub → **Settings → Secrets**:
   - `CLOUDFLARE_API_TOKEN` (токен с правом Edit Workers)
   - `CLOUDFLARE_ACCOUNT_ID`
2. Секреты приложения (`GEMINI_API_KEY`) лучше держать как Wrangler secrets на самом Worker (как в шаге 2), а не в GitHub.

Пример `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npx wrangler deploy --config dist/server/wrangler.json
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## Ограничения на Workers (честно)

| Тема | Поведение |
| --- | --- |
| SQLite L2 | Недоступен → только in-memory L1 (сбрасывается при cold start) |
| Rate limit | In-memory per isolate — слабее, чем на одном Node-процессе |
| CPU / wall time | Длинный Gemini-вызов может упереться в лимиты Free plan |
| Bundle size | Shiki + Gemini SDK тяжёлые — билд проходит, но следи за лимитами Workers |

Для портфолио-демо этого достаточно. Для продакшена позже: Cloudflare KV / D1 вместо SQLite и внешний rate limit.

---

## Траблшутинг

**`No Lovable context — skipping nitro`**  
В `vite.config.ts` должен быть явный блок `nitro: { ... }`. Уже включён.

**AI говорит «no API key»**  
Секрет не проставлен или опечатка в имени. Повтори `wrangler secret put GEMINI_API_KEY ...` и задеплой снова (или просто put — secret обновляется без rebuild).

**GitHub rate limit / failed to load repo**  
Добавь `GITHUB_TOKEN` secret. Без токена публичные репы обычно ок, но лимит низкий.

**Деплой ок, страница белая / 500**  
Смотри логи:

```bash
npx wrangler tail --config dist/server/wrangler.json
```

**Хочешь переименовать worker**  
Поменяй `nitro.cloudflare.wrangler.name` в `vite.config.ts`, задеплой, и заново `secret put` на новое имя.

---

## Быстрый чеклист

- [ ] `npm install && npm test && npm run build`
- [ ] `npx wrangler login`
- [ ] `wrangler secret put GEMINI_API_KEY --config dist/server/wrangler.json`
- [ ] (опц.) `wrangler secret put GITHUB_TOKEN --config dist/server/wrangler.json`
- [ ] `npm run deploy`
- [ ] Открыть `*.workers.dev` → `/?repo=expressjs/cors`
