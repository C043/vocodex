import os, pytest

from app.controllers.voicesController import formatVoices


@pytest.mark.asyncio
async def test_voices(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header

    # List possible voices
    resp = await client.get("/voices", headers=headers)

    assert resp.status_code == 200
    voices = resp.json()
    assert len(voices) > 0
    assert {"key", "name", "locale", "language"} <= voices[0].keys()
    assert all(v["key"].endswith("Neural") for v in voices)


def _voice(shortName, locale, localeName, status="GA"):
    return {
        "ShortName": shortName,
        "Locale": locale,
        "LocaleName": localeName,
        "Gender": "Female",
        "Status": status,
    }


def test_format_voices_names_and_filters():
    voices = [
        _voice("en-GB-LibbyNeural", "en-GB", "English (United Kingdom)"),
        _voice("en-GB-AdaMultilingualNeural", "en-GB", "English (United Kingdom)"),
        _voice("en-IN-NeerjaExpressiveNeural", "en-IN", "English (India)"),
        _voice("zh-CN-liaoning-XiaobeiNeural", "zh-CN", "Chinese (Mandarin)"),
        _voice("en-GB-OldStandard", "en-GB", "English (United Kingdom)"),
        _voice("en-GB-PreviewNeural", "en-GB", "English (United Kingdom)", "Preview"),
    ]

    result = {v["key"]: v for v in formatVoices(voices)}

    assert set(result) == {
        "en-GB-LibbyNeural",
        "en-GB-AdaMultilingualNeural",
        "en-IN-NeerjaExpressiveNeural",
        "zh-CN-liaoning-XiaobeiNeural",
    }
    assert result["en-GB-LibbyNeural"]["name"] == "Libby"
    assert result["en-GB-AdaMultilingualNeural"]["name"] == "Ada"
    assert result["en-IN-NeerjaExpressiveNeural"]["name"] == "Neerja Expressive"
    assert result["zh-CN-liaoning-XiaobeiNeural"]["name"] == "Xiaobei"
    assert result["en-GB-LibbyNeural"]["language"] == "English (United Kingdom)"


def test_format_voices_prefers_multilingual_duplicate():
    voices = [
        _voice("en-US-AvaNeural", "en-US", "English (United States)"),
        _voice("en-US-AvaMultilingualNeural", "en-US", "English (United States)"),
        _voice("en-US-EmmaMultilingualNeural", "en-US", "English (United States)"),
        _voice("en-US-EmmaNeural", "en-US", "English (United States)"),
    ]

    result = formatVoices(voices)

    assert [v["key"] for v in result] == [
        "en-US-AvaMultilingualNeural",
        "en-US-EmmaMultilingualNeural",
    ]
