import { createPublicClient, http, formatUnits } from 'viem'
import { SUPPORTED_CHAINS, SupportedChainId } from '@/config/chains'

// Map chainId to DeFiLlama chain name if needed, or use broad search
const COINGECKO_IDS: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    10: 'optimism',
    42161: 'arbitrum',
    137: 'matic-network',
    // Soneium testnet might not have a price yet, fallback to ETH price or 0
    1868: 'ethereum',
}

export async function fetchTokenPrices() {
    // Fetch prices for major native tokens
    const coins = Object.values(COINGECKO_IDS).filter((v, i, a) => a.indexOf(v) === i).join(',')
    // Using DeFiLlama which is free and efficient: https://coins.llama.fi/prices/current/coingecko:ethereum,coingecko:base...
    // Actually simpler: fetch native coin prices. 
    // Let's use a standard list of coin IDs for now.
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coins}&vs_currencies=usd`)
    if (!response.ok) throw new Error('Failed to fetch prices')
    return response.json()
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
