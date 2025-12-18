import { Alchemy, Network } from 'alchemy-sdk'
import { formatUnits } from 'viem'

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

// Configs for each chain
const settings = {
    [1]: { apiKey: API_KEY, network: Network.ETH_MAINNET },
    [10]: { apiKey: API_KEY, network: Network.OPT_MAINNET },
    [8453]: { apiKey: API_KEY, network: Network.BASE_MAINNET },
    [42161]: { apiKey: API_KEY, network: Network.ARB_MAINNET },
    [137]: { apiKey: API_KEY, network: Network.MATIC_MAINNET },
    [59144]: { apiKey: API_KEY, network: Network.LINEA_MAINNET },
    [7777777]: { apiKey: API_KEY, network: Network.ZORA_MAINNET },
    // Celo is not yet fully supported by Alchemy SDK in standard config or requires different network enum
    // We will use Blockscout for Celo for now
}

export function isAlchemySupported(chainId: number): boolean {
    return !!settings[chainId as keyof typeof settings]
}


export interface TokenBalance {
    chainId: number
    contractAddress: string
    name: string
    symbol: string
    decimals: number | null
    balance: string
    formatted: string
    logo?: string
}

// Basic metadata cache to avoid redundant API calls
const metadataCache: Record<string, any> = {}

async function getCachedMetadata(alchemy: Alchemy, contractAddress: string) {
    const key = `${alchemy.config.network}-${contractAddress.toLowerCase()}`
    if (metadataCache[key]) return metadataCache[key]

    try {
        const metadata = await alchemy.core.getTokenMetadata(contractAddress)
        metadataCache[key] = metadata
        return metadata
    } catch (err) {
        console.warn(`Failed to fetch metadata for ${contractAddress}`, err)
        return null
    }
}

// Helper for concurrency-limited processing
async function processInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = []
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch.map(fn))
        results.push(...batchResults)
        // Small delay between batches to be safe
        if (i + batchSize < items.length) await new Promise(r => setTimeout(r, 100))
    }
    return results
}

export async function fetchChainTokens(chainId: number, address: string): Promise<TokenBalance[]> {
    const config = settings[chainId as keyof typeof settings]
    if (!config) return []

    const alchemy = new Alchemy(config)

    try {
        // Attempt to fetch balances, but catch specifically to allow for fallback
        const balances = await alchemy.core.getTokenBalances(address).catch(err => {
            // Silently fail if it's a known server error to avoid console clutter
            if (chainId === 137) {
                console.warn(`[Alchemy] Polygon is currently unstable, passing to fallback...`)
            } else {
                console.warn(`[Alchemy] getTokenBalances failed for chain ${chainId}`)
            }
            return null
        })

        if (!balances || !balances.tokenBalances) {
            return []
        }

        const nonZero = balances.tokenBalances.filter(token =>
            token.tokenBalance && token.tokenBalance !== '0x' + '0'.repeat(64)
        )

        // Prioritized and Fallback tokens handling
        const PRIORITY_TOKENS: Record<number, string[]> = {
            10: ['0x46777c76dbbe40fabb2aab99e33ce20058e76c59'],
            8453: [
                '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
                '0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59',
                '0x9a33406165f562E16C3abD82fd1185482E01b49a',
                '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
                '0x944824290cc12f31ae18ef51216a223ba4063092',
                '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
                '0x532f27101965dd16442e59d40670faf5ebb142e4'
            ]
        }

        const topTokens = nonZero.slice(0, 100)
        const priorityList = PRIORITY_TOKENS[chainId] || []

        for (const pAddr of priorityList) {
            if (!topTokens.find(t => t.contractAddress.toLowerCase() === pAddr.toLowerCase())) {
                const pBal = await alchemy.core.getTokenBalances(address, [pAddr])
                if (pBal.tokenBalances[0]?.tokenBalance !== '0x' + '0'.repeat(64)) {
                    topTokens.push(pBal.tokenBalances[0])
                }
            }
        }

        // Process in small batches to avoid 429s
        const tokensData = await processInBatches(topTokens, 5, async (token): Promise<TokenBalance | null> => {
            const contractAddress = token.contractAddress.toLowerCase()
            let metadata = await getCachedMetadata(alchemy, contractAddress)
            if (!metadata) return null

            // Fallbacks for known missing metadata
            const fallbacks: Record<string, any> = {
                '0x46777c76dbbe40fabb2aab99e33ce20058e76c59': { symbol: 'L3', name: 'Layer3', decimals: 18 },
                '0x940181a94a35a4569e4529a3cdfb74e38fd98631': { symbol: 'AERO', name: 'Aerodrome', decimals: 18, logo: 'https://assets.coingecko.com/coins/images/31518/large/AERO.png' },
                '0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59': { symbol: 'JESSE', name: 'Jesse', decimals: 18 },
                '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', decimals: 8 }
            }

            const fb = fallbacks[contractAddress]
            if (fb) {
                metadata = { ...metadata, ...fb }
            }

            let formatted = '0'
            if (token.tokenBalance && metadata.decimals) {
                formatted = formatUnits(BigInt(token.tokenBalance), metadata.decimals)
            }

            return {
                chainId,
                contractAddress,
                name: metadata.name || 'Unknown',
                symbol: metadata.symbol || '???',
                decimals: metadata.decimals,
                balance: token.tokenBalance || '0x0',
                formatted,
                logo: metadata.logo || undefined
            }
        })

        return (tokensData.filter((t): t is TokenBalance => t !== null)) as TokenBalance[]

    } catch (error) {
        console.error(`Alchemy fetch failed for chain ${chainId}`, error)
        return []
    }
}
