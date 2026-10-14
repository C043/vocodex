import { useParams } from "react-router-dom"
import { PlayerContext } from "../contexts/PlayerContext"
import { PlayerControls } from "../components/player/PlayerControls"
import FontSizeControls from "../components/player/FontSizeControls"
import EntryContent from "../components/player/EntryContent"
import PdfContent from "../components/player/PdfContent"
import { usePlayerData } from "../hooks/usePlayerData"

const Player = () => {
  const { id } = useParams()
  const playerData = usePlayerData(id)
  return (
    <PlayerContext.Provider value={playerData}>
      <div>
        <audio ref={playerData.audioRef} />
        {playerData.kind === "pdf" ? <PdfContent /> : <EntryContent />}
        <FontSizeControls />
        <PlayerControls />
      </div>
    </PlayerContext.Provider>
  )
}

export default Player
