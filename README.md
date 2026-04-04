# CyberSim

Образовательный веб-прототип симулятора цифровой безопасности с `Next.js + Tailwind` на фронтенде и `FastAPI + PostgreSQL + Redis` на бэкенде.

Для локального запуска backend может работать на `SQLite`, а `Redis` используется как ускоритель и не является обязательным для локального сценария: при его отсутствии лидерборд строится из БД, а WebSocket берет состояние сессии через fallback на БД.

## Что внутри

- `apps/web` — интерфейс симулятора, личный кабинет, лидерборд, админка и раздел `Для пользователей`
- `apps/api` — FastAPI API, аутентификация, игровая логика, статистика, Swagger и admin endpoints
- `packages/shared` — общие TS-типы legacy-уровня; источник сценариев теперь backend API
- `infra` — Dockerfile, `Caddy` для локального reverse proxy и `nginx + certbot` для production
- `docs` — ER-диаграмма, API summary и описание геймплея

## Реализовано в текущей версии

- Регистрация и логин с хэшированием пароля и JWT, включая вход администратора по логину
- 3 играбельные сюжетные линии: `office`, `home`, `public-wifi`
- `Security HP`, score, подсказки и последствия ошибок
- Личный кабинет со статистикой и историей ошибок
- Админ-панель `/admin` с управлением пользователями и сценариями
- Публикация сценариев по расписанию: `draft`, `scheduled`, `live`, `disabled`
- Рейтинг на основе лучшего результата по каждому сценарию, без накрутки от повторных идеальных прохождений
- Лидерборд с Redis-кэшем по маршруту `GET /api/leaderboard`
- Верифицируемый сертификат с публичной страницей, QR-кодом и скачиванием в PDF
- Публичный раздел `Для пользователей` с интерактивными карточками рекомендаций
- Критический post-feedback в симуляторе: усиленный визуальный отклик и разбор последствий опасного решения
- `WebSocket`-обновления состояния миссии
- Swagger/OpenAPI на `/docs`
- Публичная главная в едином стиле с приложением и переключением темы

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
- [bootstrap.conf.template](/home/Flany/hack/infra/nginx/bootstrap.conf.template)
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
- при наличии старого `postgres` volume предлагает либо переиспользовать текущую БД с ее старым паролем, либо сбросить volume для чистого деплоя
- генерирует новый 12-символьный пароль администратора `Admin` и печатает его в конце деплоя
- поднимает отдельный `nginx_bootstrap` только для ACME challenge на `:80`
- получает боевой сертификат Let's Encrypt через `certbot`, не завися от состояния `api/db`
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
- leaderboard API доступен по `https://your-domain.com/api/leaderboard`, а маршрут `/leaderboard` остается страницей фронтенда

### Обновление после изменений

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### Проверка

```bash
curl -I https://your-domain.com
curl https://your-domain.com/api/health
```

### Smoke-check регистрации после deploy

```bash
chmod +x infra/deploy/smoke-auth.sh
./infra/deploy/smoke-auth.sh
```

Скрипт проходит цепочку:

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `GET /admin/users` и `GET /admin/scenarios` для admin access
- `GET /leaderboard` как HTML-страница
- `GET /api/leaderboard` как защищенный JSON endpoint
- прохождение всех 3 сценариев
- `POST /users/me/certificate`
- `GET /api/certificates/{code}` и `GET /certificates/{code}`

Это позволяет быстро проверить auth flow, route contract leaderboard и happy-path сертификата через production-домен.

## Demo Flow

1. Открыть `/` и перейти ко входу.
2. Создать пользователя на `/login`.
3. Перейти в `/simulator`.
4. Пройти сценарии `office`, `home` и `public-wifi`.
5. Открыть `/dashboard`, проверить статистику, рейтинг, раздел `Для пользователей` и выпустить сертификат.
6. Скачать сертификат в PDF или открыть публичную страницу по QR/прямой ссылке.

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
- frontend-страницы `/`, `/login`, `/leaderboard`, `/simulator`, `/admin`, `/for-users` собираются в production build
- e2e flow: регистрация -> прохождение сценариев -> статистика -> лидерборд -> сертификат
- production build фронтенда: `npm run build --workspace @cyber-sim/web`
- `docker-compose up --build` поднимает `db`, `redis`, `api`, `web`, `caddy`
- через Docker подтверждены `http://127.0.0.1:8000/api/health`, `http://127.0.0.1:3000`, `https://localhost`, `https://localhost/api/health`

## Ограничения текущего прототипа

- Полноценный TLS 1.2+ для production не проверялся в этом окружении, но структура под reverse proxy подготовлена.
- Контейнерный запуск проверен через `docker-compose`, но `docker compose` plugin на машине может отсутствовать, если установлен только отдельный пакет `docker-compose`.

## Сверка С ТЗ

Уже выполнено:

- веб-прототип с `Next.js + FastAPI + PostgreSQL + Redis`
- хранение пользователей и прогресса в БД, хэширование паролей
- 3 сюжетные линии (`Офис`, `Дом`, `Общественный Wi-Fi`) с полным прохождением
- 5+ типов угроз: фишинг, spoofed URL, социнженерия, credential stuffing, password reuse, malicious app, fake access point, captive portal phishing, MITM, payment skimming
- модуль выбора действия с подсказками и последствиями
- шкала прогресса `Security HP`, рейтинг и личный кабинет
- сертификат с публичной верификацией
- Docker Compose запуск, Swagger/OpenAPI и reverse proxy под TLS

Выполнено частично:

- UI ориентирован прежде всего на desktop-first сценарий
- админский редактор сценариев рассчитан на управляемый CRUD внутри платформы, а не на внешний импорт большого контент-пакета

Еще остается на дальнейшее развитие:

- новые ветки атак и импорт актуальных внешних кейсов
- углубление рейтинговой логики и градаций сертификата
- дополнительные кейсы атак и импорт актуальных сценариев

## Troubleshooting Deploy

- Если `deploy.sh` находит существующий volume `cyberguardsim_postgres_data`, это значит, что на сервере уже есть старая БД.
- Если эту БД нужно сохранить, вводите старый `POSTGRES_PASSWORD`.
- Если данные не нужны, выбирайте сброс volume и чистый деплой.
- Выпуск сертификата больше не зависит от того, поднялись ли `api` и `db`: challenge обслуживает отдельный `nginx_bootstrap`.
- Если `api` уходит в `unhealthy`, сначала проверьте:

```bash
docker-compose -f docker-compose.prod.yml logs --tail=200 api
docker-compose -f docker-compose.prod.yml logs --tail=200 nginx
docker-compose -f docker-compose.prod.yml ps
```
