/** Порог «цвета» карточки OVR: бронза → зелёный → фиолетовый. */
export function ovrTier(ovr: number): 'base' | 'high' | 'elite' {
  if (ovr >= 85) return 'elite'
  if (ovr >= 75) return 'high'
  return 'base'
}
