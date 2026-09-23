import type { IconName } from '../components/icons'

/** Icon names OHRR can pick for a card or page; anything else draws a star. */
const KNOWN = new Set<string>([
  'home', 'calendar', 'bag', 'heart', 'info', 'users', 'award', 'mappin', 'clock', 'book', 'gift',
  'ticket', 'mail', 'store', 'star', 'sparkles', 'camera', 'scan', 'gavel', 'phone', 'search', 'box',
])

export function iconOf(name: string | null | undefined): IconName {
  return (name && KNOWN.has(name) ? name : 'star') as IconName
}
