import { useParams } from "react-router-dom"
import { PlayerContext } from "../contexts/PlayerContext"
import { PlayerControls } from "../components/player/PlayerControls"
import FontSizeControls from "../components/player/FontSizeControls"
import EntryContent from "../components/player/EntryContent"
import PdfContent from "../components/player/PdfContent"
import PdfTextContent from "../components/player/PdfTextContent"
import { usePlayerData } from "../hooks/usePlayerData"
import { useIsDesktop } from "../hooks/useIsDesktop"

const Player = () => {
  const { id } = useParams()
  const playerData = usePlayerData(id)
  const isDesktop = useIsDesktop()
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
        {/* On mobile they live in the player options */}
        {isDesktop && <FontSizeControls />}
        <PlayerControls />
      </div>
    </PlayerContext.Provider>
  )
}

export default Player
