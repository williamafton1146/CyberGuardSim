# CyberSim Prototype

Образовательный веб-прототип симулятора цифровой безопасности с `Next.js + Tailwind` на фронтенде и `FastAPI + PostgreSQL + Redis` на бэкенде.

Для локального запуска backend может работать на `SQLite`, а `Redis` используется как ускоритель и не является обязательным для демо-сценария: при его отсутствии лидерборд строится из БД, а WebSocket берет состояние сессии через fallback на БД.

## Что внутри

- `apps/web` — desktop-first интерфейс симулятора, личный кабинет, лидерборд
- `apps/api` — FastAPI API, аутентификация, игровая логика, статистика, Swagger
- `packages/shared` — общие TS-типы и каталог сюжетных веток
- `infra` — Dockerfile и `Caddy` reverse proxy
- `docs` — ER-диаграмма, API summary и описание геймплея

## Реализованный минимальный пример

- Регистрация и логин с хэшированием пароля и JWT
- 3 сюжетные линии в каталоге
- 1 полностью играбельная миссия `office` на 4 шага
- `Security HP`, score, подсказки и последствия ошибок
- Личный кабинет со статистикой и историей ошибок
- Лидерборд с Redis-кэшем
- `WebSocket`-обновления состояния миссии
- Swagger/OpenAPI на `/docs`

## Структура

```text
apps/
  api/
  web/
docs/
infra/
packages/
  shared/
```

## Локальный запуск без Docker

### API

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

По умолчанию backend может стартовать на SQLite, но в `docker-compose.yml` уже подготовлена связка с PostgreSQL и Redis.

### Web

```bash
npm install
npm run dev:web
```

Фронтенд ожидает API по `NEXT_PUBLIC_API_URL` и WebSocket по `NEXT_PUBLIC_WS_URL`.

Для production-like запуска локально:

```bash
npm run build --workspace @cyber-sim/web
npm run start --workspace @cyber-sim/web -- --hostname 127.0.0.1 --port 3000
```

## Запуск через Docker Compose

```bash
docker-compose up --build
```

Сервисы:

- `web` — `http://localhost:3000`
- `api` — `http://localhost:8000`
- `docs` — `http://localhost:8000/docs`
- `caddy` — reverse proxy на `http://localhost`

## Деплой на сервер с Certbot

Под серверный деплой подготовлены:

- [docker-compose.prod.yml](/home/Flany/hack/docker-compose.prod.yml)
- [app.conf.template](/home/Flany/hack/infra/nginx/app.conf.template)
- [deploy.sh](/home/Flany/hack/infra/deploy/deploy.sh)
- [init-letsencrypt.sh](/home/Flany/hack/infra/deploy/init-letsencrypt.sh)

### Что нужно на сервере

- Linux-сервер с установленными `docker` и `docker-compose`
- домен, у которого `A`-запись указывает на IP сервера
- открытые порты `80` и `443`

### Подготовка

1. Скопировать проект на сервер.
2. Убедиться, что домен уже указывает на IP сервера.

### Основной путь: один bootstrap-скрипт

```bash
chmod +x infra/deploy/deploy.sh
./infra/deploy/deploy.sh
```

Скрипт сам:

- проверяет, что сервер похож на Debian/Ubuntu
- устанавливает недостающие зависимости: `docker`, compose, `curl`, `openssl`
- включает и запускает `docker`
- создает `.env`, если его еще нет
- интерактивно спрашивает `DOMAIN`, `LETSENCRYPT_EMAIL`, `SECRET_KEY`, `POSTGRES_PASSWORD`
- создает временный self-signed сертификат для первого старта `nginx`
- получает боевой сертификат Let's Encrypt через `certbot`
- поднимает production-стек
- проверяет `https://your-domain.com/api/health`
- пытается открыть сайт в браузере, если на машине доступен `xdg-open`

### Ручной низкоуровневый шаг для сертификата

Если нужно отдельно перевыпустить сертификат без полного bootstrap:

```bash
chmod +x infra/deploy/init-letsencrypt.sh
./infra/deploy/init-letsencrypt.sh
```

### Запуск production-стека

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

После этого:

- приложение доступно по `https://your-domain.com`
- API проксируется тем же доменом
- WebSocket идет через `wss://your-domain.com/ws/...`
- `certbot` работает в отдельном контейнере и периодически выполняет `renew`

### Обновление после изменений

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Проверка

```bash
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

## Demo Flow

1. Открыть `/login` и создать пользователя.
2. Перейти в `/simulator`.
3. Запустить сценарий `Офис: письмо от ИТ-поддержки`.
4. Сделать один ошибочный выбор и увидеть подсказку и последствия.
5. Завершить миссию и проверить обновленную статистику в `/dashboard`.

## Тесты

```bash
cd apps/api
pytest
```
## Локальные артефакты

В репозиторий не должны попадать:

- `node_modules`, `.next`, `dist`, `build`, `coverage`
- `.venv`, `.pytest_cache`, `__pycache__`, `*.pyc`
- локальные `.env` файлы, кроме `.env.example`
- временные sqlite-файлы вроде `*.db`, `*.sqlite`, `*.sqlite3`

Для этого в проекте настроены [.gitignore](/home/Flany/hack/.gitignore) и [.dockerignore](/home/Flany/hack/.dockerignore). Если после локальной работы проект снова разрастается, безопасно чистить именно воспроизводимые артефакты: зависимости, сборку, кэши, виртуальные окружения и локальные базы.
## Что проверено локально

- `GET /api/health` возвращает `200`
- frontend-страницы `/`, `/login`, `/simulator` отвечают `200`
- e2e flow: регистрация -> старт миссии -> ошибочный ответ -> WebSocket-апдейт -> завершение миссии -> статистика -> лидерборд
- `pytest` для backend: `2 passed`
- production build фронтенда: `npm run build --workspace @cyber-sim/web`
- `docker-compose up --build` поднимает `db`, `redis`, `api`, `web`, `caddy`
- через Docker подтверждены `http://127.0.0.1:8000/api/health`, `http://127.0.0.1:3000`, `https://localhost`, `https://localhost/api/health`

## Ограничения текущего прототипа

- Ветки `home` и `public-wifi` представлены как архитектурные заготовки.
- Полноценный TLS 1.2+ для production не проверялся в этом окружении, но структура под reverse proxy подготовлена.
- Контейнерный запуск проверен через `docker-compose`, но `docker compose` plugin на машине может отсутствовать, если установлен только отдельный пакет `docker-compose`.
