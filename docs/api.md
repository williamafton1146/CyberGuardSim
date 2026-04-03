# API Summary

Базовый backend поднимается на FastAPI и автоматически публикует Swagger по `/docs`.

## Auth

- `POST /auth/register` — создает пользователя и сразу возвращает `access_token`
- `POST /auth/login` — авторизация по email/паролю

## Users

- `GET /users/me` — профиль текущего пользователя
- `GET /users/me/stats` — статистика, прогресс по веткам и последние ошибки

## Scenarios

- `GET /scenarios` — список сюжетных линий
- `GET /scenarios/{slug}` — детали сценария и шаги

## Sessions

- `POST /sessions` — старт новой миссии
- `POST /sessions/{session_id}/answers` — отправка выбранного действия и получение обратной связи

### Start Session Request

```json
{
  "scenario_slug": "office"
}
```

### Answer Request

```json
{
  "option_id": 12
}
```

## Leaderboard

- `GET /leaderboard` — рейтинг по `security_rating`

## WebSocket

- `WS /ws/sessions/{session_id}` — обновления состояния текущей миссии, включая `hp_left`, `score`, `status` и `current_step`

