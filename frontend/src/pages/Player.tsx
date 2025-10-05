import { useParams } from "react-router-dom"

const Player = () => {
  const { id } = useParams()
  return <h1>{id}</h1>
}

export default Player
