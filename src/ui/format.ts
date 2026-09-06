/**
 * Ступеней у показателя состояния. Восемь — не круглое число ради круглого:
 * меньше огрубляет разницу между «под вопросом» и «сдержанное», больше
 * потребовало бы различать оттенки, для которых в языке нет отдельных слов.
 */
export const GAUGE_BANDS = 8

/**
 * Ступень показателя 0..100.
 *
 * Цифры игроку не показываются: «доверие тренера 63» — это точность, которой у
 * игры нет, и приглашение оптимизировать число вместо того, чтобы читать
 * положение. Слово говорит ровно то, что игра действительно знает.
 */
export function gaugeBand(value: number): number {
  const clamped = Math.min(100, Math.max(0, value))
  return Math.min(GAUGE_BANDS - 1, Math.floor((clamped / 100) * GAUGE_BANDS))
}

/** То же для двусторонней шкалы −100..100: ноль приходится на стык ступеней. */
export function bipolarBand(value: number): number {
  const clamped = Math.min(100, Math.max(-100, value))
  return Math.min(GAUGE_BANDS - 1, Math.floor(((clamped + 100) / 200) * GAUGE_BANDS))
}

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
