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

    Promise.all([getMe(token), getAdminUsers(token), getAdminScenarios(token)])
      .then(([me, usersPayload, scenariosPayload]) => {
        if (me.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setCurrentAdmin(me);
        saveAuthUser(me);
        setUsers(usersPayload);
        setScenarios(scenariosPayload);
        setError(null);
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

        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <section className="glass-card p-6">
            <div className="flex items-center gap-3">
              <div className="feature-icon">
                <Users size={18} />
              </div>
              <div>
                <p className="eyebrow">Аккаунты</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">Управление пользователями</h2>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <div className="soft-tile text-sm text-[var(--color-text-muted)]">Загружаем список аккаунтов.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="soft-tile admin-user-card">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{user.display_name}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        {user.role === "admin" ? `Логин: ${user.username || "Admin"}` : user.email}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--color-accent)]">
                        Рейтинг {user.security_rating} • Завершено {user.completed_scenarios}
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
              )}
            </div>
          </section>

          <section className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="feature-icon">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <p className="eyebrow">Сценарии</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">CMS обучающих кейсов</h2>
                </div>
              </div>
              <button type="button" className="primary-button" onClick={() => setSelectedScenarioId("new")}>
                <Plus size={16} />
                Новый сценарий
              </button>
            </div>

            <div className="mt-6 admin-scenario-layout">
              <div className="admin-scenario-list">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    className={`soft-tile admin-scenario-list-item ${selectedScenarioId === scenario.id ? "admin-scenario-list-item-active" : ""}`}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    <span className="admin-scenario-status">{scenario.status}</span>
                    <strong className="admin-scenario-name">{scenario.title}</strong>
                    <span className="admin-scenario-meta">
                      {scenario.step_count} шага • {scenario.is_playable ? "доступен игрокам" : "скрыт"}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleScenarioSubmit} className="admin-scenario-editor">
                <div className="admin-editor-head">
                  <div>
                    <p className="eyebrow">{selectedScenario ? "Редактирование" : "Создание"}</p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                      {selectedScenario ? selectedScenario.title : "Новый сценарий"}
                    </h3>
                  </div>
                  {selectedScenario ? (
                    <button type="button" className="secondary-button" onClick={handleDeleteScenario}>
                      <Trash2 size={16} />
                      Удалить
                    </button>
                  ) : null}
                </div>

                {selectedScenario?.has_sessions ? (
                  <div className="soft-tile admin-warning-card">
                    У сценария уже есть пользовательские прохождения. Можно менять метаданные и расписание, но нельзя менять шаги и варианты ответов.
                  </div>
                ) : null}

                <div className="admin-editor-grid">
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                    Slug
                    <input
                      value={form.slug}
                      onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                      className="admin-input"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                    Сложность
                    <input
                      value={form.difficulty}
                      onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))}
                      className="admin-input"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                    Название
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="admin-input"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                    Тема
                    <input
                      value={form.theme}
                      onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))}
                      className="admin-input"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                    Описание
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      className="admin-input admin-textarea"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                    Дата и время премьеры
                    <input type="datetime-local" value={releaseLocal} onChange={(event) => setReleaseLocal(event.target.value)} className="admin-input" />
                  </label>
                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={form.is_enabled}
                      onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))}
                    />
                    <span>Сценарий включён для публикации</span>
                  </label>
                </div>

                <div className="admin-steps-head">
                  <div>
                    <p className="eyebrow">Шаги</p>
                    <h4 className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">Нарратив и варианты ответа</h4>
                  </div>
                  <button type="button" className="secondary-button" onClick={addStep}>
                    <Plus size={16} />
                    Добавить шаг
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {form.steps.map((step, stepIndex) => (
                    <div key={`${step.step_order}-${stepIndex}`} className="soft-tile admin-step-card">
                      <div className="admin-step-head">
                        <strong className="text-[var(--color-text-primary)]">Шаг {stepIndex + 1}</strong>
                        <button type="button" className="secondary-button admin-inline-action" onClick={() => removeStep(stepIndex)}>
                          <Trash2 size={16} />
                          Удалить шаг
                        </button>
                      </div>

                      <div className="admin-editor-grid mt-4">
                        <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                          Prompt
                          <textarea
                            value={step.prompt}
                            onChange={(event) => updateStep(stepIndex, { prompt: event.target.value })}
                            className="admin-input admin-textarea"
                            required
                          />
                        </label>
                        <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                          Тип угрозы
                          <input
                            value={step.threat_type}
                            onChange={(event) => updateStep(stepIndex, { threat_type: event.target.value })}
                            className="admin-input"
                            required
                          />
                        </label>
                        <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                          Объяснение
                          <textarea
                            value={step.explanation}
                            onChange={(event) => updateStep(stepIndex, { explanation: event.target.value })}
                            className="admin-input admin-textarea"
                            required
                          />
                        </label>
                      </div>

                      <div className="admin-options-head">
                        <p className="eyebrow">Варианты ответа</p>
                        <button type="button" className="secondary-button admin-inline-action" onClick={() => addOption(stepIndex)}>
                          <Plus size={16} />
                          Добавить вариант
                        </button>
                      </div>

                      <div className="mt-4 space-y-4">
                        {step.options.map((option, optionIndex) => (
                          <div key={`${stepIndex}-${optionIndex}`} className="admin-option-card">
                            <div className="admin-option-head">
                              <label className="admin-toggle">
                                <input type="radio" checked={option.is_correct} onChange={() => updateOption(stepIndex, optionIndex, { is_correct: true })} />
                                <span>Правильный ответ</span>
                              </label>
                              <button type="button" className="secondary-button admin-inline-action" onClick={() => removeOption(stepIndex, optionIndex)}>
                                <Trash2 size={16} />
                                Удалить
                              </button>
                            </div>

                            <div className="admin-editor-grid mt-4">
                              <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                Текст варианта
                                <textarea
                                  value={option.label}
                                  onChange={(event) => updateOption(stepIndex, optionIndex, { label: event.target.value })}
                                  className="admin-input admin-textarea"
                                  required
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-[var(--color-text-muted)]">
                                HP delta
                                <input
                                  type="number"
                                  value={option.hp_delta}
                                  onChange={(event) => updateOption(stepIndex, optionIndex, { hp_delta: Number(event.target.value) })}
                                  className="admin-input"
                                  required
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                Подсказка
                                <textarea
                                  value={option.hint ?? ""}
                                  onChange={(event) => updateOption(stepIndex, optionIndex, { hint: event.target.value })}
                                  className="admin-input admin-textarea"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-[var(--color-text-muted)] admin-grid-span">
                                Последствие
                                <textarea
                                  value={option.consequence_text}
                                  onChange={(event) => updateOption(stepIndex, optionIndex, { consequence_text: event.target.value })}
                                  className="admin-input admin-textarea"
                                  required
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                  <button type="submit" className="primary-button" disabled={savingScenario}>
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
                  >
                    <ShieldCheck size={16} />
                    Очистить форму
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
