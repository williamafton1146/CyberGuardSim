# ER Diagram

```mermaid
erDiagram
    users ||--o{ game_sessions : starts
    users ||--o| certificates : owns
    users ||--o{ user_scenario_progress : aggregates
    scenarios ||--o{ scenario_steps : contains
    scenarios ||--o{ game_sessions : used_in
    scenarios ||--o{ user_scenario_progress : tracks
    scenario_steps ||--o{ decision_options : offers
    game_sessions ||--o{ answer_events : records
    scenario_steps ||--o{ answer_events : references
    decision_options ||--o{ answer_events : chosen

    users {
        int id PK
        string email UK
        string username UK
        string password_hash
        string display_name
        string role
        int security_rating
        string league
        datetime created_at
    }

    scenarios {
        int id PK
        string slug UK
        string title
        string theme
        string difficulty
        text description
        bool is_playable
        bool is_enabled
        datetime release_at
        datetime created_at
        datetime updated_at
    }

    scenario_steps {
        int id PK
        int scenario_id FK
        int step_order
        text prompt
        string threat_type
        text explanation
    }

    decision_options {
        int id PK
        int step_id FK
        string label
        bool is_correct
        int hp_delta
        text hint
        text consequence_text
    }

    game_sessions {
        int id PK
        int user_id FK
        int scenario_id FK
        datetime started_at
        datetime finished_at
        int hp_left
        int score
        string status
        int current_step_order
    }

    user_scenario_progress {
        int id PK
        int user_id FK
        int scenario_id FK
        int best_score
        bool best_completed
        int attempts_count
        datetime last_played_at
        datetime created_at
        datetime updated_at
    }

    certificates {
        int id PK
        int user_id FK
        string code UK
        string display_name
        string league
        int security_rating
        datetime issued_at
    }

    answer_events {
        int id PK
        int session_id FK
        int step_id FK
        int option_id FK
        bool is_correct
        datetime created_at
    }
```

`users` хранит аутентификацию и роль, `game_sessions` фиксирует отдельные прохождения, `user_scenario_progress` агрегирует лучший результат по каждому сценарию, а `answer_events` позволяет строить статистику ошибок и детальный трекинг прогресса.
