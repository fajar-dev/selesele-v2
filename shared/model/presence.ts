export interface CanvasPresence {
  sessionId: string
  userId: string
  name: string
  color: string
  cursor: { x: number, y: number } | null
  selected: string[]
  updatedAt: number
}
