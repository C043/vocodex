import edge_tts


async def getVoices():
    voices = await edge_tts.list_voices()
    print(voices)
    return voices
