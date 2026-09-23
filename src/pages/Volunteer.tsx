import { Card, btn } from '../components/ui'
import { Icon } from '../components/icons'
import { FestivalPageView } from './Festival'
import { useFestival } from '../lib/data'
import { OHRR_SITE, ext } from '../lib/links'

// Volunteering at BunFest: OHRR's own page (Staff → BunFest → Pages →
// Volunteer at BunFest), with the way to sign up underneath.
export default function Volunteer() {
  const f = useFestival()
  const signUp = f.festival?.info.volunteerUrl
  return (
    <FestivalPageView
      slug="volunteer"
      extra={
        <Card className="bg-brand-blue-50/50">
          <h2 className="font-display text-xl font-extrabold text-ink">Sign up</h2>
          <p className="mt-1 text-base text-slate-800">
            {signUp
              ? 'Pick your area and time slot on the festival’s volunteer sign-up.'
              : 'Tell OHRR you’d like to help and a volunteer will be in touch.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={signUp ?? `${OHRR_SITE}/volunteer/interest?role=${encodeURIComponent('Midwest BunFest')}`} {...ext} className={btn.primary}>
              <Icon name="users" size={22} /> Volunteer at BunFest
            </a>
          </div>
        </Card>
      }
    />
  )
}
