# CyberGuardSim

Образовательный веб-прототип симулятора цифровой безопасности: интерактивные сценарии, личный кабинет, рейтинг, сертификат и административное управление контентом.

Стек проекта:
- `TypeScript + Next.js + React + Tailwind CSS` на фронтенде
- `FastAPI + SQLAlchemy + PostgreSQL + Redis` на бэкенде
- `Docker Compose + nginx + WebSockets` для локального и production-окружения

Проект закрывает базовые требования по ТЗ:
- 3 сценария: `office`, `home`, `public-wifi`
- 5+ типов атак и пошаговый разбор последствий ошибки
- HP/score, рейтинг, кабинет, сертификат, админка
- OpenAPI/Swagger и ER-диаграмма
- one-command запуск через Compose
- `TLSv1.2/TLSv1.3` в production-конфиге `nginx`

## Что есть в репозитории

- `apps/web` — интерфейс, симулятор, кабинет, рейтинг, сертификаты, админка, раздел `Для пользователей`
- `apps/api` — API, аутентификация, игровая логика, статистика, admin endpoints, WebSocket
- `infra` — Dockerfile, `nginx`, deploy-скрипты, Let's Encrypt и cleanup-утилиты
- `docs` — API summary, ERD и заметки по геймплею

## Реализованные возможности

- Регистрация и логин с хэшированием пароля и JWT
- Отдельный вход администратора по логину `Admin` со случайно генерируемым к нему паролем при запуске.
- 3 игровые среды: офисная почта, домашняя цифровая среда, общественный Wi‑Fi
- `Security HP`, очки, блокирующий разбор ошибки и итоговый экран сценария
- Прогресс по веткам, рейтинг, лиги и личный кабинет
- Лидерборд как HTML-страница `/leaderboard` и API-маршрут `/api/leaderboard`
- Выпуск и публичная проверка сертификата с QR-кодом
- Раздел `Для пользователей` с карточками по фишингу, QR-фишингу, кодам из SMS, дипфейкам, поддельным приложениям и реакции на инцидент
- Админка для управления пользователями с возможностью добавления сценариев и публикации их к определённому времени.
- Публикация сценариев происходит по статусам: `draft`, `scheduled`, `live`, `disabled`
- Swagger/OpenAPI на `/docs`

## Быстрый локальный запуск

Поддерживаются обе формы команды:

```bash
docker compose up --build
```

или

```bash
docker-compose up --build
```

После запуска доступны:
- приложение: `http://localhost`
- healthcheck API: `http://localhost/api/health`
- Swagger: `http://localhost/docs`

Локальный стек поднимает:
- `db`
- `redis`
- `api`
- `web`
- `nginx`

Локальный reverse proxy работает по `HTTP`, без локального TLS.

### Локальные dev-значения по умолчанию

В локальном Compose используются dev-значения из `docker-compose.yml`:
- admin login: `Admin`
- admin password: `AdminCyber12`

Эти значения нужны только для локальной разработки и не должны использоваться в production.

## Локальный запуск без Docker

### Frontend

```bash
npm install
npm run dev:web
```

Production-like сборка фронтенда:

```bash
npm run build --workspace @cyberguardsim/web
npm run start --workspace @cyberguardsim/web -- --hostname 127.0.0.1 --port 3000
```

### Backend

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Production deploy

Основной путь:

```bash
./infra/deploy/deploy.sh
```

Скрипт:
- проверяет Docker/Compose и базовые утилиты
- создаёт или обновляет `.env`
- валидирует base и production compose-конфиги
- при повторном деплое запускает безопасную cleanup-фазу
- при необходимости добавляет adaptive swap через `/swapfile-cyberguardsim`
- выпускает или переиспользует сертификат Let's Encrypt
- поднимает стек через `docker-compose.yml + docker-compose.prod.yml`
- проверяет `https://<domain>/api/health`
- запускает auth smoke test
- печатает bootstrap-пароль администратора, если он реально совпадает с текущим admin-аккаунтом

Дополнительные команды:

```bash
./infra/deploy/init-letsencrypt.sh
./infra/deploy/smoke-auth.sh https://your-domain.com
```

Ручной запуск production-стека:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Проверенные локально команды

В рамках финального repo+local аудита подтверждены:

```bash
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
docker-compose -f docker-compose.yml config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml config
npm run build --workspace @cyberguardsim/web
PYTHONPATH=apps/api apps/api/.venv/bin/pytest -q
bash -n infra/deploy/deploy.sh
bash -n infra/deploy/init-letsencrypt.sh
bash -n infra/deploy/smoke-auth.sh
```

Также локально подтверждён импорт backend entrypoint:

```bash
apps/api/.venv/bin/python -c "import sys; sys.path.insert(0, 'apps/api'); import app.main; print('api-import-ok')"
```

## Документация

- API summary: `docs/api.md`
- ER-диаграмма: `docs/erd.md`
- Gameplay notes: `docs/gameplay.md`

## Тесты

Backend:

```bash
PYTHONPATH=apps/api apps/api/.venv/bin/pytest -q
```

Frontend build:

```bash
npm run build --workspace @cyberguardsim/web
```

## Важные замечания

- Проект сейчас `desktop-first`, но мобильный интерфейс и адаптивные сценарии тоже поддерживаются.
- Production TLS настраивается шаблоном `infra/nginx/app.conf.template` и ограничен `TLSv1.2/TLSv1.3`.
- Корневые SQLite-файлы вроде `cyberguardsim.db` или `cybersec.db` считаются локальными артефактами разработки, а не частью исходного кода.

## Структура и чистота репозитория

Для защиты build context и git-истории исключены:
- `node_modules`, `.next`, `dist`, `build`, `coverage`
- `.venv`, `.pytest_cache`, `__pycache__`, `*.pyc`
- локальные `.env` файлы, кроме `.env.example`
- временные SQLite-файлы: `*.db`, `*.sqlite`, `*.sqlite3`
- runtime-артефакты `letsencrypt` и deploy-state

Если нужно вручную почистить локальные артефакты проекта:

```bash
./infra/deploy/cleanup-temp.sh
./infra/deploy/cleanup-system-artifacts.sh
```
