import { useParams } from "react-router-dom"
import { PlayerContext } from "../contexts/PlayerContext"
import { PlayerControls } from "../components/player/PlayerControls"
import EntryContent from "../components/player/EntryContent"
import PdfContent from "../components/player/PdfContent"
import PdfTextContent from "../components/player/PdfTextContent"
import { usePlayerData } from "../hooks/usePlayerData"
import { useFocusMode } from "../hooks/useFocusMode"

const Player = () => {
  const { id } = useParams()
  const playerData = usePlayerData(id)
  useFocusMode()
  return (
    <PlayerContext.Provider value={playerData}>
      <div>
        <audio ref={playerData.audioRef} />
        {playerData.kind !== "pdf" ? (
          <EntryContent />
        ) : playerData.pdfView === "text" ? (
          <PdfTextContent />
        ) : (
          <PdfContent />
        )}
        <PlayerControls />
      </div>
    </PlayerContext.Provider>
  )
}

export default Player
