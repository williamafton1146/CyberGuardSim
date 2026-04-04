# API Summary

Базовый backend поднимается на FastAPI и автоматически публикует Swagger по `/docs`.

## Auth

- `POST /auth/register` — создает пользователя и сразу возвращает `access_token`
- `POST /auth/login` — авторизация по `identifier + password`; обычный пользователь входит по email, админ может входить по логину `Admin`

## Users

- `GET /users/me` — профиль текущего пользователя
- `GET /users/me/stats` — статистика, прогресс по веткам и последние ошибки
- `GET /users/me/certificate` — статус сертификата текущего пользователя
- `POST /users/me/certificate` — выпуск сертификата после завершения всех доступных сценариев

## Scenarios

- `GET /scenarios` — список только опубликованных и уже открытых игрокам сюжетных линий
- `GET /scenarios/{slug}` — детали live-сценария и шаги

## Sessions

- `POST /sessions` — старт новой миссии; выключенные и запланированные сценарии не запускаются
- `POST /sessions/{session_id}/answers` — отправка выбранного действия и получение обратной связи; ответ содержит `severity` (`safe`, `warning`, `critical`) для UI-фидбека

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

- `GET /api/leaderboard` — защищенный рейтинг по `security_rating`

## Certificates

- `GET /api/certificates/{code}` — публичная верификация выпущенного сертификата

## Admin

- `GET /admin/users` — список пользователей и базовая статистика
- `DELETE /admin/users/{id}` — удаление пользовательского аккаунта
- `GET /admin/scenarios` — список всех сценариев, включая `draft`, `scheduled`, `live`, `disabled`
- `POST /admin/scenarios` — создание нового сценария
- `PATCH /admin/scenarios/{id}` — обновление сценария, публикации и расписания
- `DELETE /admin/scenarios/{id}` — удаление сценария без пользовательских прохождений

## WebSocket

- `WS /ws/sessions/{session_id}` — обновления состояния текущей миссии, включая `hp_left`, `score`, `status` и `current_step`
