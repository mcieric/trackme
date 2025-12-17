import { NextResponse } from 'next/server'

const SUPERCHAIN_TOKEN_LIST_URL = 'https://ethereum-optimism.github.io/optimism.tokenlist.json'

export async function GET() {
    try {
        const response = await fetch(SUPERCHAIN_TOKEN_LIST_URL, {
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch upstream: ${response.statusText}`)
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Proxy error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch token list' },
            { status: 500 }
        )
    }
}
