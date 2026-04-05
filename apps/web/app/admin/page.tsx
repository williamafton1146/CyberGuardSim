"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, PencilLine, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  createAdminScenario,
  updateAdminScenario,
  deleteAdminScenario,
  deleteAdminUser,
  getAdminScenarios,
  getAdminUsers,
  getMe
} from "@/lib/api";
import { getStoredUser, getToken, saveAuthUser } from "@/lib/auth";
import type {
  AdminScenario,
  AdminScenarioInput,
  AdminScenarioOptionInput,
  AdminScenarioStepInput,
  AdminUser,
  UserProfile
} from "@/types";

export const dynamic = "force-dynamic";

function createEmptyOption(): AdminScenarioOptionInput {
  return {
    label: "",
    is_correct: false,
    hp_delta: 0,
    hint: "",
    consequence_text: ""
  };
}

function createEmptyStep(order: number): AdminScenarioStepInput {
  return {
    step_order: order,
    prompt: "",
    threat_type: "",
    explanation: "",
    options: [
      { ...createEmptyOption(), is_correct: true },
      createEmptyOption(),
      createEmptyOption()
    ]
  };
}

function createEmptyScenario(): AdminScenarioInput {
  return {
    slug: "",
    title: "",
    theme: "",
    difficulty: "medium",
    description: "",
    is_enabled: false,
    release_at: null,
    steps: [createEmptyStep(1)]
  };
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

function formatScenarioStatus(status: AdminScenario["status"]) {
  switch (status) {
    case "draft":
      return "Черновик";
    case "scheduled":
      return "Премьера по расписанию";
    case "live":
      return "Опубликован";
    case "disabled":
      return "Отключён";
    default:
      return status;
  }
}

function scenarioToInput(scenario: AdminScenario): AdminScenarioInput {
  return {
    slug: scenario.slug,
    title: scenario.title,
    theme: scenario.theme,
    difficulty: scenario.difficulty,
    description: scenario.description,
    is_enabled: scenario.is_enabled,
    release_at: scenario.release_at,
    steps: scenario.steps.map((step) => ({
      step_order: step.step_order,
      prompt: step.prompt,
      threat_type: step.threat_type,
      explanation: step.explanation,
      options: step.options.map((option) => ({
        label: option.label,
        is_correct: option.is_correct,
        hp_delta: option.hp_delta,
        hint: option.hint,
        consequence_text: option.consequence_text
      }))
    }))
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<UserProfile | null>(getStoredUser<UserProfile>());
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [scenarios, setScenarios] = useState<AdminScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | "new">("new");
  const [form, setForm] = useState<AdminScenarioInput>(createEmptyScenario());
  const [releaseLocal, setReleaseLocal] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingScenario, setSavingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login?next=/admin");
      return;
    }

    Promise.allSettled([getMe(token), getAdminUsers(token), getAdminScenarios(token)])
      .then(([meResult, usersResult, scenariosResult]) => {
        if (meResult.status !== "fulfilled") {
          throw meResult.reason;
        }

        const me = meResult.value;
        if (me.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setCurrentAdmin(me);
        saveAuthUser(me);

        const nextErrors: string[] = [];

        if (usersResult.status === "fulfilled") {
          setUsers(usersResult.value);
        } else {
          setUsers([]);
          nextErrors.push(usersResult.reason instanceof Error ? `Пользователи: ${usersResult.reason.message}` : "Пользователи: не удалось загрузить");
        }

        if (scenariosResult.status === "fulfilled") {
          setScenarios(scenariosResult.value);
        } else {
          setScenarios([]);
          nextErrors.push(
            scenariosResult.reason instanceof Error ? `Сценарии: ${scenariosResult.reason.message}` : "Сценарии: не удалось загрузить"
          );
        }

        setError(nextErrors.length ? nextErrors.join(" | ") : null);
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить админский раздел");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (selectedScenarioId === "new") {
      setForm(createEmptyScenario());
      setReleaseLocal("");
      return;
    }

    const scenario = scenarios.find((item) => item.id === selectedScenarioId);
    if (!scenario) {
      return;
    }

    setForm(scenarioToInput(scenario));
    setReleaseLocal(toDateTimeLocal(scenario.release_at));
  }, [scenarios, selectedScenarioId]);

  const selectedScenario = useMemo(
    () => (selectedScenarioId === "new" ? null : scenarios.find((item) => item.id === selectedScenarioId) || null),
    [scenarios, selectedScenarioId]
  );
  const scenarioLocked = Boolean(selectedScenario?.has_sessions);
  const adminSummary = useMemo(
    () => ({
      users: users.length,
      activeUsers: users.filter((user) => user.role !== "admin").length,
      liveScenarios: scenarios.filter((scenario) => scenario.status === "live").length,
      scheduledScenarios: scenarios.filter((scenario) => scenario.status === "scheduled").length
    }),
    [scenarios, users]
  );
  const editorBusy = loading || savingScenario;

  async function reloadAdminData() {
    const token = getToken();
    if (!token) {
      return;
    }
    const [usersPayload, scenariosPayload] = await Promise.all([getAdminUsers(token), getAdminScenarios(token)]);
    setUsers(usersPayload);
    setScenarios(scenariosPayload);
  }

  async function handleDeleteUser(userId: number) {
    const token = getToken();
    if (!token) {
      return;
    }
    const user = users.find((item) => item.id === userId);
    if (!user || !window.confirm(`Удалить аккаунт ${user.display_name}? Это действие необратимо.`)) {
      return;
    }

    try {
      setError(null);
      setInfo(null);
      await deleteAdminUser(token, userId);
      await reloadAdminData();
      setInfo(`Аккаунт ${user.display_name} удалён.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить аккаунт");
    }
  }

  function updateStep(stepIndex: number, patch: Partial<AdminScenarioStepInput>) {
    setForm((current) => {
      const nextSteps = current.steps.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step));
      return { ...current, steps: nextSteps };
    });
  }

  function updateOption(stepIndex: number, optionIndex: number, patch: Partial<AdminScenarioOptionInput>) {
    setForm((current) => {
      const nextSteps = current.steps.map((step, currentStepIndex) => {
        if (currentStepIndex !== stepIndex) {
          return step;
        }

        const nextOptions = step.options.map((option, currentOptionIndex) => {
          if (currentOptionIndex !== optionIndex) {
            return patch.is_correct ? { ...option, is_correct: false } : option;
          }
          return { ...option, ...patch };
        });
        return { ...step, options: nextOptions };
      });
      return { ...current, steps: nextSteps };
    });
  }

  function addStep() {
    setForm((current) => ({
      ...current,
      steps: [...current.steps, createEmptyStep(current.steps.length + 1)]
    }));
  }

  function removeStep(stepIndex: number) {
    setForm((current) => {
      const nextSteps = current.steps.filter((_, index) => index !== stepIndex).map((step, index) => ({
        ...step,
        step_order: index + 1
      }));
      return { ...current, steps: nextSteps.length ? nextSteps : [createEmptyStep(1)] };
    });
  }

  function addOption(stepIndex: number) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, index) =>
        index === stepIndex ? { ...step, options: [...step.options, createEmptyOption()] } : step
      )
    }));
  }

  function removeOption(stepIndex: number, optionIndex: number) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, index) => {
        if (index !== stepIndex) {
          return step;
        }
        const nextOptions = step.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex);
        if (!nextOptions.some((option) => option.is_correct) && nextOptions[0]) {
          nextOptions[0] = { ...nextOptions[0], is_correct: true };
        }
        return { ...step, options: nextOptions.length ? nextOptions : [{ ...createEmptyOption(), is_correct: true }] };
      })
    }));
  }

  async function handleScenarioSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      return;
    }

    setSavingScenario(true);
    setError(null);
    setInfo(null);

    try {
      const payload: AdminScenarioInput = {
        ...form,
        release_at: fromDateTimeLocal(releaseLocal),
        steps: form.steps.map((step, index) => ({
          ...step,
          step_order: index + 1
        }))
      };

      const response =
        selectedScenarioId === "new"
          ? await createAdminScenario(token, payload)
          : await updateAdminScenario(token, selectedScenarioId, payload);

      await reloadAdminData();
      setSelectedScenarioId(response.id);
      setInfo(selectedScenarioId === "new" ? "Сценарий создан." : "Сценарий обновлён.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось сохранить сценарий");
    } finally {
      setSavingScenario(false);
    }
  }

  async function handleDeleteScenario() {
    const token = getToken();
    if (!token || selectedScenarioId === "new" || !selectedScenario) {
      return;
    }

    if (!window.confirm(`Удалить сценарий ${selectedScenario.title}?`)) {
      return;
    }

    try {
      setError(null);
      setInfo(null);
      await deleteAdminScenario(token, selectedScenarioId);
      await reloadAdminData();
      setSelectedScenarioId("new");
      setInfo("Сценарий удалён.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить сценарий");
    }
  }

  return (
    <RequireAuth>
      <div className="shell shell-wide space-y-10 py-12">
        <SectionTitle
          eyebrow="Admin"
          title={currentAdmin ? `Панель администратора: ${currentAdmin.display_name}` : "Панель администратора"}
          description="Здесь можно управлять аккаунтами, запуском сценариев и временем публикации игровых веток."
        />

        {error ? (
          <p className="rounded-[1.2rem] border border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] px-4 py-3 text-sm text-[var(--color-alert)]">
            {error}
          </p>
        ) : null}

        {info ? (
          <p className="rounded-[1.2rem] border border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
            {info}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="soft-tile admin-summary-card">
            <span className="admin-summary-label">Всего аккаунтов</span>
            <strong className="admin-summary-value">{loading ? "—" : adminSummary.users}</strong>
          </div>
          <div className="soft-tile admin-summary-card">
            <span className="admin-summary-label">Пользователи</span>
            <strong className="admin-summary-value">{loading ? "—" : adminSummary.activeUsers}</strong>
          </div>
          <div className="soft-tile admin-summary-card">
            <span className="admin-summary-label">Live-сценарии</span>
            <strong className="admin-summary-value">{loading ? "—" : adminSummary.liveScenarios}</strong>
          </div>
          <div className="soft-tile admin-summary-card">
            <span className="admin-summary-label">Премьеры</span>
            <strong className="admin-summary-value">{loading ? "—" : adminSummary.scheduledScenarios}</strong>
          </div>
        </div>

        <div className="admin-workspace">
          <section className="glass-card admin-panel">
            <div className="admin-panel-head">
              <div className="admin-panel-heading">
                <div className="feature-icon">
                  <Users size={18} />
                </div>
                <div>
                  <p className="eyebrow">Аккаунты</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Управление пользователями</h2>
                </div>
              </div>
            </div>

            <div className="admin-panel-scroll admin-users-scroll">
              {loading ? (
                <div className="soft-tile admin-empty-state">Загружаем список аккаунтов.</div>
              ) : users.length ? (
                users.map((user) => (
                  <div key={user.id} className="soft-tile admin-user-card">
                    <div className="admin-user-copy">
                      <p className="admin-user-name">{user.display_name}</p>
                      <p className="admin-user-meta">
                        {user.role === "admin" ? `Логин: ${user.username || "Admin"}` : user.email}
                      </p>
                      <p className="admin-user-stats">
                        Рейтинг {user.security_rating} • Завершено {user.completed_scenarios} • Сессий {user.total_sessions}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button admin-inline-action"
                      disabled={user.id === currentAdmin?.id || user.role === "admin"}
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  </div>
                ))
              ) : (
                <div className="soft-tile admin-empty-state">Пока нет доступных аккаунтов для управления.</div>
              )}
            </div>
          </section>

          <section className="glass-card admin-panel admin-cms-panel">
            <div className="admin-panel-head admin-panel-head-split">
              <div className="admin-panel-heading">
                <div className="feature-icon">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <p className="eyebrow">Сценарии</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">CMS обучающих кейсов</h2>
                </div>
                  </div>
              <button type="button" className="primary-button" onClick={() => setSelectedScenarioId("new")} disabled={loading}>
                <Plus size={16} />
                Новый сценарий
              </button>
            </div>

            <div className="admin-scenario-layout">
              <div className="admin-scenario-list-panel">
                <div className="admin-panel-subhead">
                  <p className="eyebrow">Каталог</p>
                  <p className="admin-panel-subcopy">Черновики, премьеры и живые сценарии в одном списке.</p>
                </div>
                <div className="admin-scenario-list-scroll">
                  <div className="admin-scenario-list">
                    {loading ? (
                      <div className="soft-tile admin-empty-state">Загружаем сценарии и их статусы.</div>
                    ) : scenarios.length ? (
                      scenarios.map((scenario) => (
                        <button
                          key={scenario.id}
                          type="button"
                          className={`soft-tile admin-scenario-list-item ${selectedScenarioId === scenario.id ? "admin-scenario-list-item-active" : ""}`}
                          onClick={() => setSelectedScenarioId(scenario.id)}
                        >
                          <span className="admin-scenario-status">{formatScenarioStatus(scenario.status)}</span>
                          <strong className="admin-scenario-name">{scenario.title}</strong>
                          <span className="admin-scenario-meta">
                            {scenario.step_count} шага • {scenario.is_playable ? "доступен игрокам" : "скрыт"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="soft-tile admin-empty-state">
                        Сценарии ещё не созданы. Нажмите «Новый сценарий» и заполните ветку справа.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="admin-editor-panel">
                <form onSubmit={handleScenarioSubmit} className="admin-scenario-editor">
                  <div className="admin-editor-scroll">
                    <div className="admin-editor-head admin-editor-sticky-head">
                      <div>
                        <p className="eyebrow">{selectedScenario ? "Редактирование" : "Создание"}</p>
                        <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                          {selectedScenario ? selectedScenario.title : "Новый сценарий"}
                        </h3>
                      </div>
                      <div className="admin-editor-head-actions">
                        {scenarioLocked ? <span className="admin-lock-chip">Структура зафиксирована</span> : null}
                        {selectedScenario && !scenarioLocked ? (
                          <button type="button" className="secondary-button" onClick={handleDeleteScenario} disabled={editorBusy}>
                            <Trash2 size={16} />
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {scenarioLocked ? (
                      <div className="soft-tile admin-warning-card">
                        У сценария уже есть пользовательские прохождения. Можно менять метаданные и расписание, но шаги и варианты ответов зафиксированы.
                      </div>
                    ) : null}

                      <div className="admin-editor-grid">
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                          Slug
                          <input
                            value={form.slug}
                            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                            className="admin-input"
                            required
                            maxLength={100}
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                          Сложность
                          <input
                            value={form.difficulty}
                            onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
                            className="admin-input"
                            required
                            maxLength={50}
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                          Название
                          <input
                            value={form.title}
                            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                            className="admin-input"
                            required
                            maxLength={255}
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                          Тема
                          <input
                            value={form.theme}
                            onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))}
                            className="admin-input"
                            required
                            maxLength={255}
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                          Описание
                          <textarea
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                            className="admin-input admin-textarea"
                            required
                            maxLength={1500}
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                          Дата и время премьеры
                          <input
                            type="datetime-local"
                            value={releaseLocal}
                            onChange={(event) => setReleaseLocal(event.target.value)}
                            className="admin-input"
                            disabled={editorBusy}
                          />
                        </label>
                        <label className="admin-toggle admin-grid-span admin-publish-toggle">
                          <input
                            type="checkbox"
                            checked={form.is_enabled}
                            onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))}
                            disabled={editorBusy}
                          />
                          <span>
                            <strong>Опубликовать сценарий</strong>
                            <small>Если сценарий включён, он появится по расписанию и станет доступен игрокам после даты премьеры.</small>
                          </span>
                        </label>
                      </div>

                    <div className="admin-steps-head">
                      <div>
                        <p className="eyebrow">Шаги</p>
                          <h4 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Нарратив и варианты ответа</h4>
                      </div>
                      {!scenarioLocked ? (
                        <button type="button" className="secondary-button" onClick={addStep} disabled={editorBusy}>
                          <Plus size={16} />
                          Добавить шаг
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-5">
                      {form.steps.map((step, stepIndex) => (
                        <div key={`${step.step_order}-${stepIndex}`} className="soft-tile admin-step-card">
                          <div className="admin-step-head">
                            <strong className="text-[var(--color-text-primary)]">Шаг {stepIndex + 1}</strong>
                            {!scenarioLocked ? (
                              <button
                                type="button"
                                className="secondary-button admin-inline-action"
                                onClick={() => removeStep(stepIndex)}
                                disabled={editorBusy}
                              >
                                <Trash2 size={16} />
                                Удалить шаг
                              </button>
                            ) : null}
                          </div>

                          <div className="admin-editor-grid mt-4">
                            <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                              Prompt
                              <textarea
                                value={step.prompt}
                                onChange={(event) => updateStep(stepIndex, { prompt: event.target.value })}
                                className="admin-input admin-textarea"
                                required
                                maxLength={2000}
                                disabled={scenarioLocked || editorBusy}
                              />
                            </label>
                            <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                              Тип угрозы
                              <input
                                value={step.threat_type}
                                onChange={(event) => updateStep(stepIndex, { threat_type: event.target.value })}
                                className="admin-input"
                                required
                                maxLength={120}
                                disabled={scenarioLocked || editorBusy}
                              />
                            </label>
                            <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                              Объяснение
                              <textarea
                                value={step.explanation}
                                onChange={(event) => updateStep(stepIndex, { explanation: event.target.value })}
                                className="admin-input admin-textarea"
                                required
                                maxLength={3000}
                                disabled={scenarioLocked || editorBusy}
                              />
                            </label>
                          </div>

                          <div className="admin-options-head">
                            <p className="eyebrow">Варианты ответа</p>
                            {!scenarioLocked ? (
                              <button
                                type="button"
                                className="secondary-button admin-inline-action"
                                onClick={() => addOption(stepIndex)}
                                disabled={editorBusy}
                              >
                                <Plus size={16} />
                                Добавить вариант
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-4">
                            {step.options.map((option, optionIndex) => (
                              <div key={`${stepIndex}-${optionIndex}`} className="soft-tile admin-option-card">
                                <div className="admin-option-head">
                                  <label className="admin-toggle">
                                    <input
                                      type="radio"
                                      checked={option.is_correct}
                                      onChange={() => updateOption(stepIndex, optionIndex, { is_correct: true })}
                                      disabled={scenarioLocked || editorBusy}
                                    />
                                    <span>Правильный ответ</span>
                                  </label>
                                  {!scenarioLocked ? (
                                    <button
                                      type="button"
                                      className="secondary-button admin-inline-action"
                                      onClick={() => removeOption(stepIndex, optionIndex)}
                                      disabled={editorBusy}
                                    >
                                      <Trash2 size={16} />
                                      Удалить
                                    </button>
                                  ) : null}
                                </div>

                                <div className="admin-editor-grid mt-4">
                                  <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                    Текст варианта
                                    <textarea
                                      value={option.label}
                                      onChange={(event) => updateOption(stepIndex, optionIndex, { label: event.target.value })}
                                      className="admin-input admin-textarea"
                                      required
                                      maxLength={255}
                                      disabled={scenarioLocked || editorBusy}
                                    />
                                  </label>
                                  <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)]">
                                    HP delta
                                    <input
                                      type="number"
                                      value={option.hp_delta}
                                      onChange={(event) => updateOption(stepIndex, optionIndex, { hp_delta: Number(event.target.value) })}
                                      className="admin-input"
                                      required
                                      disabled={scenarioLocked || editorBusy}
                                    />
                                  </label>
                                  <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                    Подсказка
                                    <textarea
                                      value={option.hint ?? ""}
                                      onChange={(event) => updateOption(stepIndex, optionIndex, { hint: event.target.value })}
                                      className="admin-input admin-textarea"
                                      maxLength={500}
                                      disabled={scenarioLocked || editorBusy}
                                    />
                                  </label>
                                  <label className="grid gap-2.5 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                    Последствие
                                    <textarea
                                      value={option.consequence_text}
                                      onChange={(event) => updateOption(stepIndex, optionIndex, { consequence_text: event.target.value })}
                                      className="admin-input admin-textarea"
                                      required
                                      maxLength={1500}
                                      disabled={scenarioLocked || editorBusy}
                                    />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="admin-editor-footer">
                    <button type="submit" className="primary-button" disabled={editorBusy}>
                      <PencilLine size={16} />
                      {savingScenario ? "Сохраняем..." : selectedScenario ? "Сохранить сценарий" : "Создать сценарий"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setSelectedScenarioId("new");
                        setInfo(null);
                        setError(null);
                      }}
                      disabled={editorBusy}
                    >
                      <ShieldCheck size={16} />
                      Очистить форму
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
