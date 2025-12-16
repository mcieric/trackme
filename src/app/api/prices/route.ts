import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')

    if (!ids) {
        return NextResponse.json({ error: 'Missing ids' }, { status: 400 })
    }

    try {
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
            {
                next: { revalidate: 60 },
                headers: {
                    'Accept': 'application/json'
                }
            }
        )

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.statusText}`)
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Proxy price fetch error:', error)
        return NextResponse.json({}, { status: 500 })
    }
}
