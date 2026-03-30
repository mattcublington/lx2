import { redirect } from 'next/navigation'

// Events and tournaments have been merged into a single "Tournaments" concept.
// Redirect /events to /tournaments for backwards compatibility.
export default function EventsPage() {
  redirect('/tournaments')
}
