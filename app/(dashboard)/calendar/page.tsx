import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import { RenewalCalendar } from '@/components/calendar/RenewalCalendar'
import type { Subscription } from '@/types'

async function getSubscriptions(): Promise<Subscription[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/subscriptions`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function CalendarPage() {
  const subscriptions = await getSubscriptions()
  return (
    <div>
      <Header title="Renewal Calendar" />
      <div className="p-6 max-w-3xl">
        <Card>
          <CardContent className="pt-6">
            <RenewalCalendar subscriptions={subscriptions} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
