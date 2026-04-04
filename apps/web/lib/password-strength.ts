const COMMON_PASSWORD_FRAGMENTS = [
  "password",
  "passw0rd",
  "qwerty",
  "123456",
  "12345678",
  "admin",
  "welcome",
  "letmein",
  "iloveyou"
];

const SEQUENCE_SAMPLES = [
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789",
  "qwertyuiopasdfghjklzxcvbnm",
  "йцукенгшщзхъфывапролджэячсмитьбю"
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "");
}

function containsSequence(value: string, length = 4) {
  if (value.length < length) {
    return false;
  }

  return SEQUENCE_SAMPLES.some((sample) => {
    for (let index = 0; index <= sample.length - length; index += 1) {
      const chunk = sample.slice(index, index + length);
      if (value.includes(chunk) || value.includes(chunk.split("").reverse().join(""))) {
        return true;
      }
    }
    return false;
  });
}

function extractContextFragments(identifier: string, displayName: string) {
  const fragments = new Set<string>();
  const normalizedIdentifier = normalize(identifier.split("@")[0] ?? identifier);
  const normalizedName = normalize(displayName);

  if (normalizedIdentifier.length >= 3) {
    fragments.add(normalizedIdentifier);
  }

  if (normalizedName.length >= 3) {
    fragments.add(normalizedName);
  }

  return Array.from(fragments);
}

export type PasswordStrength = {
  label: string;
  width: number;
  tone: "weak" | "medium" | "good" | "strong";
  advice: string;
  blockReason: string | null;
};

export function evaluatePassword(password: string, context: { identifier: string; displayName: string }): PasswordStrength {
  const normalized = normalize(password);
  const contextFragments = extractContextFragments(context.identifier, context.displayName);

  const blockReason =
    (!normalized && "Пароль должен содержать не только служебные символы") ||
    (COMMON_PASSWORD_FRAGMENTS.some((fragment) => normalized.includes(fragment)) &&
      "Пароль слишком предсказуемый: используйте уникальную фразу без шаблонов вроде password или qwerty") ||
    (contextFragments.some((fragment) => normalized.includes(fragment)) && "Пароль не должен содержать части email или отображаемого имени") ||
    (new Set(normalized).size <= Math.max(3, Math.floor(normalized.length / 3)) && "Пароль содержит слишком много повторяющихся символов") ||
    (/^(.)\1{5,}$/i.test(normalized) && "Пароль не должен состоять из повторяющегося символа") ||
    (containsSequence(normalized) && "Пароль не должен содержать простые последовательности символов или цифр") ||
    (normalized.length < 10 && (/^[a-zа-я]+$/i.test(normalized) || /^\d+$/.test(normalized)) && "Короткий пароль из одного типа символов слишком легко подобрать") ||
    null;

  if (blockReason) {
    return {
      label: "Слишком слабый пароль",
      width: 12,
      tone: "weak",
      advice: blockReason,
      blockReason
    };
  }

  const classes = [
    /[A-ZА-Я]/.test(password),
    /[a-zа-я]/.test(password),
    /\d/.test(password),
    /[^A-Za-zА-Яа-я0-9]/.test(password)
  ].filter(Boolean).length;
  const lengthScore = Math.min(password.length, 20) * 2.7;
  const uniquenessScore = normalized.length
    ? Math.min(24, Math.round((new Set(normalized).size / normalized.length) * 26))
    : 0;
  const classScore = classes * 8;
  const bonus = password.length >= 16 ? 10 : password.length >= 12 ? 5 : 0;
  let score = Math.round(lengthScore + uniquenessScore + classScore + bonus);

  if (/([a-zа-я])\1{2,}/i.test(password) || /(\d)\1{2,}/.test(password)) {
    score -= 10;
  }

  score = Math.max(0, Math.min(score, 100));

  if (score < 40) {
    return {
      label: "Слабый пароль",
      width: 28,
      tone: "weak",
      advice: "Увеличьте длину, уберите повторы и добавьте уникальные символы, которые не связаны с вами.",
      blockReason: null
    };
  }

  if (score < 60) {
    return {
      label: "Средняя защита",
      width: 54,
      tone: "medium",
      advice: "Неплохо, но лучше сделать пароль длиннее и добавить ещё больше уникальности.",
      blockReason: null
    };
  }

  if (score < 80) {
    return {
      label: "Хороший пароль",
      width: 78,
      tone: "good",
      advice: "Уже хорошо. Самое важное теперь — не использовать этот пароль где-либо ещё.",
      blockReason: null
    };
  }

  return {
    label: "Надёжный пароль",
    width: 100,
    tone: "strong",
    advice: "Сохраните его в менеджере паролей и не используйте повторно.",
    blockReason: null
  };
}
