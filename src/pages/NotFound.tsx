import { Link } from 'react-router-dom'
import { Container, PageTitle, btn } from '../components/ui'

export default function NotFound() {
  return (
    <>
      <PageTitle title="Page not found" />
      <Container className="mt-8 space-y-4">
        <p className="text-lg">That page isn't here — it may have moved. Every page is listed at the bottom of this one.</p>
        <Link to="/" className={btn.blue}>
          Go to the Midwest BunFest home page
        </Link>
      </Container>
    </>
  )
}
