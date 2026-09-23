import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Visit from './pages/Visit'
import YourRabbit from './pages/YourRabbit'
import Schedule from './pages/Schedule'
import Speakers from './pages/Speakers'
import { FestivalList, FestivalPageView } from './pages/Festival'
import Vendors from './pages/Vendors'
import Rescues from './pages/Rescues'
import Sponsors from './pages/Sponsors'
import EventMap from './pages/EventMap'
import Auction from './pages/Auction'
import Volunteer from './pages/Volunteer'
import Past from './pages/Past'
import NotFound from './pages/NotFound'

/** The home page has no page title bar; every other page names itself (PageTitle). */
function DocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname === '/') document.title = 'Midwest BunFest'
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <DocumentTitle />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="visit" element={<Visit />} />
          <Route path="your-rabbit" element={<YourRabbit />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="speakers" element={<Speakers />} />
          <Route path="festival" element={<FestivalList />} />
          <Route path="festival/:slug" element={<FestivalPageView />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="rescues" element={<Rescues />} />
          <Route path="sponsors" element={<Sponsors />} />
          <Route path="map" element={<EventMap />} />
          <Route path="auction" element={<Auction />} />
          <Route path="volunteer" element={<Volunteer />} />
          <Route path="past" element={<Past />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
