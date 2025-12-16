import { createPublicClient, http, formatUnits } from 'viem'
import { SUPPORTED_CHAINS, SupportedChainId } from '@/config/chains'

const COINGECKO_IDS = [
    'ethereum',
    'optimism',
    'base',
    'arbitrum',
    'matic-network',
    'velodrome-finance',
    'usd-coin',
    'tether',
    'wrapped-bitcoin'
]

// Simple mapping for demo
export const SYMBOL_MAP: Record<string, string> = {
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'OP': 'optimism',
    'VELO': 'velodrome-finance',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'ARB': 'arbitrum',
    'MATIC': 'matic-network',
    'POL': 'matic-network',
    'WBTC': 'wrapped-bitcoin'
}

export async function fetchTokenPrices() {
    try {
        const ids = COINGECKO_IDS.join(',')
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
            { next: { revalidate: 60 } }
        )

        if (!response.ok) throw new Error('Failed to fetch prices')

        const data = await response.json()

        // Normalize return to handle both ID lookups and Symbol lookups logic downstream
        return data
    } catch (error) {
        console.error('Error fetching prices:', error)
        return {}
    }
}

export async function getNativeBalance(address: string, chainId: SupportedChainId) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain) throw new Error('Chain not supported')

    const client = createPublicClient({
        chain,
        transport: http()
    })

    try {
        const balance = await client.getBalance({ address: address as `0x${string}` })
        return {
            chainId,
            balance: balance,
            formatted: formatUnits(balance, chain.nativeCurrency.decimals),
            symbol: chain.nativeCurrency.symbol
        }
    } catch (error) {
        console.error(`Error fetching balance for ${chain.name}:`, error)
        return {
            chainId,
            balance: 0n,
            formatted: '0',
            symbol: chain.nativeCurrency.symbol
        }
    }
}
