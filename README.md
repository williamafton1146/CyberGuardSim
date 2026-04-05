# CyberGuardSim

Образовательный веб-прототип симулятора цифровой безопасности с `Next.js + Tailwind` на фронтенде и `FastAPI + PostgreSQL + Redis` на бэкенде.

Проект соответствует базовым требованиям ТЗ:
- веб-формат с one-command запуском через `docker-compose up`
- TLS 1.2/1.3 в production
- модульная архитектура
- Swagger/OpenAPI и ER-диаграмма
- 3 сюжетных сценария, рейтинг, кабинет, лидерборд, сертификат и раздел `Для пользователей`

## Что внутри

- `apps/web` — интерфейс симулятора, личный кабинет, лидерборд, админка и раздел `Для пользователей`
- `apps/api` — FastAPI API, аутентификация, игровая логика, статистика, Swagger и admin endpoints
- `infra` — Dockerfile, `nginx`, `certbot` и deploy-скрипты
- `docs` — ER-диаграмма, API summary и описание геймплея

## Реализовано

- Регистрация и логин с хэшированием пароля и JWT, включая вход администратора по логину
- 3 играбельные сюжетные линии: `office`, `home`, `public-wifi`
- `Security HP`, score, подсказки и последствия ошибок
- Блокирующее модальное объяснение ошибок в симуляторе и итоговый экран сценария
- Личный кабинет со статистикой и историей ошибок
- Админ-панель `/admin` с управлением пользователями и сценариями
- Публикация сценариев по расписанию: `draft`, `scheduled`, `live`, `disabled`
- Рейтинг на основе лучшего результата по каждому сценарию
- Лидерборд с Redis-кэшем по маршруту `GET /api/leaderboard`
- Верифицируемый сертификат с публичной страницей, QR-кодом и скачиванием в PDF
- Публичный раздел `Для пользователей` с интерактивными карточками рекомендаций на основе материалов Kaspersky и публичных антифрод-памяток Минцифры
- `WebSocket`-обновления состояния миссии
- Swagger/OpenAPI на `/docs`

## Локальный запуск через Docker Compose

One-command путь по ТЗ:

```bash
docker-compose up --build
```

После запуска:
- приложение доступно по `http://localhost`
- API доступен через тот же reverse proxy, например `http://localhost/api/health`
- Swagger доступен по `http://localhost/docs`

Локальный стек поднимает `db`, `redis`, `api`, `web`, `nginx`.

## Локальный запуск без Docker

### API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Web

```bash
npm install
npm run dev:web
```

Для production-like запуска фронтенда локально:

```bash
npm run build --workspace @cyberguardsim/web
npm run start --workspace @cyberguardsim/web -- --hostname 127.0.0.1 --port 3000
```

## Production deploy

Основной путь:

```bash
chmod +x infra/deploy/deploy.sh
./infra/deploy/deploy.sh
```

Скрипт:
- проверяет и ставит системные зависимости `docker`, compose, `curl`, `openssl`
- создаёт или обновляет `.env`
- валидирует base compose и production override
- при повторном деплое безопасно чистит project/system мусор от проекта
- для слабых серверов адаптивно добавляет `/swapfile-cyberguardsim`, если текущего swap не хватает
- получает или переиспользует сертификат Let's Encrypt
- поднимает production-стек через `docker-compose.yml + docker-compose.prod.yml`
- проверяет `https://<domain>/api/health`
- прогоняет auth smoke test
- печатает bootstrap-пароль администратора `Admin`

### Низкоуровневый выпуск сертификата

```bash
chmod +x infra/deploy/init-letsencrypt.sh
./infra/deploy/init-letsencrypt.sh
```

### Ручной запуск production-стека

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

### Проверка production

```bash
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

### Smoke-check после deploy

```bash
chmod +x infra/deploy/smoke-auth.sh
SMOKE_RESOLVE_IP=127.0.0.1 ./infra/deploy/smoke-auth.sh https://your-domain.com
```

Smoke test проверяет:
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `GET /leaderboard` как HTML-страницу
- `GET /api/leaderboard` как защищённый JSON endpoint
- прохождение всех 3 сценариев
- `POST /users/me/certificate`
- `GET /api/certificates/{code}` и `GET /certificates/{code}`

## Документация

- API summary: [docs/api.md](/home/Flany/hack/docs/api.md)
- ER-диаграмма: [docs/erd.md](/home/Flany/hack/docs/erd.md)
- Gameplay notes: [docs/gameplay.md](/home/Flany/hack/docs/gameplay.md)

## Тесты

Backend:

```bash
cd apps/api
pytest
```

Frontend production build:

```bash
npm run build --workspace @cyberguardsim/web
```

## Локальные артефакты

В git и docker build context не должны попадать:
- `node_modules`, `.next`, `dist`, `build`, `coverage`
- `.venv`, `.pytest_cache`, `__pycache__`, `*.pyc`
- локальные `.env` файлы, кроме `.env.example`
- временные SQLite-файлы вроде `*.db`, `*.sqlite`, `*.sqlite3`
- runtime-артефакты letsencrypt и deploy-state

Для этого настроены [.gitignore](/home/Flany/hack/.gitignore) и [.dockerignore](/home/Flany/hack/.dockerignore).
