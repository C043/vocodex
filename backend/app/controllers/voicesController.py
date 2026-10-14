import re

import edge_tts

_voicesCache: list[dict] | None = None


def _splitName(shortName: str, locale: str) -> tuple[str, bool]:
    """
    'en-GB-AdaMultilingualNeural' -> ('Ada', True)
    'en-IN-NeerjaExpressiveNeural' -> ('Neerja Expressive', False)
    'zh-CN-liaoning-XiaobeiNeural' -> ('Xiaobei', False)
    """
    raw = shortName.removeprefix(f"{locale}-").split("-")[-1]
    raw = raw.removesuffix("Neural")
    isMultilingual = raw.endswith("Multilingual")
    raw = raw.removesuffix("Multilingual")
    name = " ".join(re.findall(r"[A-Z][a-z]*|[a-z]+|\d+", raw)) or raw
    return name, isMultilingual


def formatVoices(voices: list[dict]) -> list[dict]:
    """
    Keep only the neural voices and give them a human name. When a voice
    exists both as plain and multilingual in the same locale, keep the
    multilingual one (it sounds better) so names stay unique.
    """
    byKey: dict[tuple[str, str], tuple[dict, bool]] = {}

    for voice in voices:
        shortName = voice.get("ShortName", "")
        locale = voice.get("Locale", "")
        if not shortName.endswith("Neural") or voice.get("Status", "GA") != "GA":
            continue

        name, isMultilingual = _splitName(shortName, locale)
        formatted = {
            "key": shortName,
            "name": name,
            "locale": locale,
            "language": voice.get("LocaleName")
            or voice.get("FriendlyName", "").split(" - ")[-1]
            or locale,
            "gender": voice.get("Gender"),
        }

        existing = byKey.get((locale, name))
        if existing and existing[1] and not isMultilingual:
            continue
        byKey[(locale, name)] = (formatted, isMultilingual)

    return sorted(
        (formatted for formatted, _ in byKey.values()),
        key=lambda v: (v["language"], v["name"]),
    )


async def getVoices():
    global _voicesCache
    if _voicesCache is None:
        voices = await edge_tts.list_voices()
        _voicesCache = formatVoices(voices)
    return _voicesCache
