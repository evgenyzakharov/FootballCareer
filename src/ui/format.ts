/** Порог «цвета» карточки OVR: бронза → зелёный → фиолетовый. */
export function ovrTier(ovr: number): 'base' | 'high' | 'elite' {
  if (ovr >= 85) return 'elite'
  if (ovr >= 75) return 'high'
  return 'base'
}

/** Подпись сезона вида «2026/27» из года первого сезона и текущего возраста. */
export function seasonLabel(startYear: number, age: number, startAge = 16): string {
  const year = startYear + (age - startAge)
  return `${year}/${String((year + 1) % 100).padStart(2, '0')}`
}

/** Короткая подпись сезона для чипов: «2026/27» → «’27». */
export function seasonShort(startYear: number, age: number, startAge = 16): string {
  const endYear = startYear + (age - startAge) + 1
  return `’${String(endYear % 100).padStart(2, '0')}`
}
