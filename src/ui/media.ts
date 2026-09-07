import { useEffect, useState } from 'react'

/**
 * Граница телефонной раскладки. Держится в паре с `@media (max-width: 860px)`
 * в стилях: ниже неё колонки складываются в одну.
 */
const PHONE = '(max-width: 860px)'

/**
 * Телефонная раскладка — вопрос к разметке, а не к стилям.
 *
 * Почти всё, что меняется на узком экране, умеет медиазапрос, и трогать за это
 * React незачем. Но две вещи он не умеет: свернуть блок так, чтобы свёрнутое
 * не висело в дереве, и переставить ленту сезона в чужого родителя — во
 * вкладку досье. Ради них и заведён хук.
 */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(PHONE)
    const onChange = () => setPhone(mq.matches)
    // Между первым показом и подпиской окно могли повернуть — сверяемся сразу.
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return phone
}

/** Что закрепляется на телефоне, сверху вниз. */
const PINNED = ['.topbar', '.career > .facts', '.dossier .tabs'] as const

/**
 * Признак «страницу листают» — атрибутом на корне документа.
 *
 * По нему закреплённая шапка ужимается: восемь шкал стоят двести пятьдесят
 * пикселей, и вместе с верхней панелью и рядом вкладок закреплённое съедало
 * шестьдесят процентов телефонного экрана — ленте оставалось меньше, чем
 * занимает одна карточка. Наверху шкалы видны все; стоит уйти вниз читать, они
 * уступают место тому, ради чего вниз и ушли, и возвращаются на прежнем месте.
 *
 * Порог с гистерезисом: спрятавшись, шкалы укорачивают страницу, и на одной
 * границе появление и исчезновение гоняли бы друг друга.
 */
const HIDE_AT = 32
const SHOW_AT = 16

export function useCompactWhenScrolled(active: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    const clear = () => root.removeAttribute('data-scrolled')
    if (!active) {
      clear()
      return clear
    }

    let compact = false
    const check = () => {
      const y = window.scrollY
      if (!compact && y > HIDE_AT) {
        compact = true
        root.setAttribute('data-scrolled', 'yes')
      } else if (compact && y < SHOW_AT) {
        compact = false
        clear()
      }
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      window.removeEventListener('scroll', check)
      clear()
    }
  }, [active])
}

/**
 * Высоты закреплённой стопки — в переменные CSS.
 *
 * `position: sticky` умеет держать элемент у края окна, но не умеет складывать
 * несколько таких элементов друг под друга: каждому нужен `top`, равный сумме
 * высот всех, кто выше. Высоты эти CSS не знает — верхняя панель растёт от
 * длины названия, шапка от числа шкал, ряд вкладок переносится на две строки, —
 * и промах здесь означает не кривой отступ, а куски интерфейса поверх друг
 * друга. Поэтому их меряют и кладут в `--pin-top`, `--pin-tabs` и `--pin-end`.
 *
 * `--pin-end` — низ всей стопки. По нему лента знает, куда возвращаться на
 * решении: «к началу» для неё значит «под закреплённое», а не «под край окна».
 *
 * Раскрытая шапка в стопку не входит: она отдаёт закрепление и уезжает вверх
 * как обычный блок (см. `[data-open]` в стилях), и вкладки поднимаются на её
 * место.
 */
export function usePinnedStack(active: boolean): void {
  useEffect(() => {
    const root = document.documentElement
    const clear = () => {
      for (const name of ['--pin-top', '--pin-tabs', '--pin-end']) root.style.removeProperty(name)
    }
    if (!active || typeof ResizeObserver === 'undefined') {
      clear()
      return clear
    }

    const apply = () => {
      let top = 0
      const stack: number[] = []
      for (const selector of PINNED) {
        const el = document.querySelector(selector)
        // Раскрытая шапка стоит в потоке: её высота стопке не принадлежит.
        const height = el && el.getAttribute('data-open') !== 'yes' ? el.getBoundingClientRect().height : 0
        stack.push(top)
        top += height
      }
      root.style.setProperty('--pin-top', `${Math.round(stack[1])}px`)
      root.style.setProperty('--pin-tabs', `${Math.round(stack[2])}px`)
      root.style.setProperty('--pin-end', `${Math.round(top)}px`)
    }

    apply()
    const observer = new ResizeObserver(apply)
    for (const selector of PINNED) {
      const el = document.querySelector(selector)
      if (el) observer.observe(el)
    }
    return () => {
      observer.disconnect()
      clear()
    }
  }, [active])
}
