import { NextResponse } from 'next/server'

const EXPLORERS: Record<number, string> = {
    1: 'https://eth.blockscout.com/api',
    10: 'https://optimism.blockscout.com/api',
    8453: 'https://base.blockscout.com/api',
    42161: 'https://arbitrum.blockscout.com/api',
    137: 'https://polygon.blockscout.com/api',
    1868: 'https://soneium.blockscout.com/api',
    42220: 'https://celo.blockscout.com/api',
    56: 'https://bsc.blockscout.com/api',
    43114: 'https://avalanche.blockscout.com/api',
    81457: 'https://blast.blockscout.com/api',
    534352: 'https://scroll.blockscout.com/api',
    5000: 'https://mantle.blockscout.com/api'
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const chainId = searchParams.get('chainId')
    const address = searchParams.get('address')

    if (!chainId || !address) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const baseUrl = EXPLORERS[Number(chainId) as keyof typeof EXPLORERS]
    if (!baseUrl) {
        return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
    }

    try {
        const url = `${baseUrl}?module=account&action=tokenlist&address=${address}`
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'TrackMe-Portfolio/1.0'
            },
            next: { revalidate: 60 } // Cache for 60s
        })

        if (!res.ok) {
            throw new Error(`Blockscout API error: ${res.statusText}`)
        }

        const data = await res.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Blockscout proxy error:', error)
        return NextResponse.json({ status: '0', message: 'Error', result: [] }, { status: 500 })
    }
}
