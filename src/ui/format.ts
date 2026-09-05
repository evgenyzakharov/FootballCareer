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

/**
 * Год, которым заканчивается сезон. Турниры сборных играются летом после
 * сезона, и подписывать их надо этим годом: «Чемпионат мира 2030», а не
 * «сезон 2029/30» — в разговоре о турнире сезон клуба ни при чём.
 */
export function seasonEndYear(startYear: number, age: number, startAge = 16): number {
  return startYear + (age - startAge) + 1
}

/** Короткая подпись сезона для чипов: «2026/27» → «’27». */
export function seasonShort(startYear: number, age: number, startAge = 16): string {
  const endYear = startYear + (age - startAge) + 1
  return `’${String(endYear % 100).padStart(2, '0')}`
}
