import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA_CLIENT_EMAIL,
        private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    })

    const [realtime] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${process.env.GA_PROPERTY_ID}`,
      minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
      metrics: [{ name: 'activeUsers' }],
    })

    const activeNow = realtime.rows?.[0]?.metricValues?.[0]?.value ?? '0'

    return NextResponse.json({ activeNow })
  } catch (error) {
    console.error('Realtime analytics error:', error)
    return NextResponse.json({ activeNow: '0' }, { status: 500 })
  }
}