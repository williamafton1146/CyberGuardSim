import re


COMMON_PASSWORD_FRAGMENTS = {
    "password",
    "passw0rd",
    "qwerty",
    "123456",
    "12345678",
    "admin",
    "welcome",
    "letmein",
    "iloveyou",
}

SEQUENCE_SAMPLES = (
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "qwertyuiopasdfghjklzxcvbnm",
    "йцукенгшщзхъфывапролджэячсмитьбю",
)


def _normalize_fragment(value: str) -> str:
    return re.sub(r"[^a-zа-я0-9]+", "", value.lower())


def extract_password_context(email: str, display_name: str) -> list[str]:
    fragments: set[str] = set()

    local_part = email.split("@", maxsplit=1)[0]
    for piece in re.split(r"[^a-zа-я0-9]+", _normalize_fragment(local_part)):
        if len(piece) >= 3:
            fragments.add(piece)

    for piece in re.split(r"[^a-zа-я0-9]+", _normalize_fragment(display_name)):
        if len(piece) >= 3:
            fragments.add(piece)

    return sorted(fragments)


def _contains_sequence(value: str, length: int = 4) -> bool:
    if len(value) < length:
        return False

    for sample in SEQUENCE_SAMPLES:
        for start in range(0, len(sample) - length + 1):
            chunk = sample[start : start + length]
            if chunk in value or chunk[::-1] in value:
                return True
    return False


def password_weakness_reason(password: str, *, context_fragments: list[str] | None = None) -> str | None:
    normalized = _normalize_fragment(password)
    if not normalized:
        return "Пароль должен содержать не только служебные символы"

    if any(fragment in normalized for fragment in COMMON_PASSWORD_FRAGMENTS):
        return "Пароль слишком предсказуемый: используйте уникальную фразу без шаблонов вроде password или qwerty"

    if context_fragments and any(fragment in normalized for fragment in context_fragments):
        return "Пароль не должен содержать части email или отображаемого имени"

    if len(set(normalized)) <= max(3, len(normalized) // 3):
        return "Пароль содержит слишком много повторяющихся символов"

    if re.fullmatch(r"(.)\1{5,}", normalized):
        return "Пароль не должен состоять из повторяющегося символа"

    if _contains_sequence(normalized):
        return "Пароль не должен содержать простые последовательности символов или цифр"

    if len(normalized) < 10 and (normalized.isalpha() or normalized.isdigit()):
        return "Короткий пароль из одного типа символов слишком легко подобрать"

    return None
