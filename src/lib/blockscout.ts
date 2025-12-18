import { TokenBalance } from './alchemy'
import { formatUnits } from 'viem'

// Explorer API endpoints
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

export function isBlockscoutSupported(chainId: number): boolean {
    return !!EXPLORERS[chainId as keyof typeof EXPLORERS]
}

interface BlockscoutToken {
    balance: string
    contractAddress: string
    decimals: string
    name: string
    symbol: string
    type: string
}

export async function fetchBlockscoutTokens(chainId: number, address: string): Promise<TokenBalance[]> {
    const baseUrl = EXPLORERS[chainId as keyof typeof EXPLORERS]
    if (!baseUrl) return []

    try {
        // Use local proxy to avoid CORS
        const url = `/api/blockscout?chainId=${chainId}&address=${address}`
        const res = await fetch(url)

        if (!res.ok) return []

        const data = await res.json()

        if (data.status !== '1' || !Array.isArray(data.result)) return []

        // Map to our TokenBalance interface
        return data.result
            .filter((t: BlockscoutToken) => t.type === 'ERC-20' && t.contractAddress && t.symbol)
            .map((t: BlockscoutToken) => {
                const decimals = parseInt(t.decimals || '18')
                // Format balance
                let formatted = '0'
                try {
                    formatted = formatUnits(BigInt(t.balance), decimals)
                } catch (e) {
                    console.warn(`Error formatting balance for ${t.symbol}`, e)
                }

                return {
                    chainId,
                    contractAddress: t.contractAddress.toLowerCase(),
                    name: t.name,
                    symbol: t.symbol,
                    decimals: decimals,
                    balance: t.balance, // Keep raw string
                    formatted,
                    logo: undefined // Blockscout might not provide logo easily
                }
            })

    } catch (error) {
        console.error(`Blockscout fetch failed for chain ${chainId}`, error)
        return []
    }
}
