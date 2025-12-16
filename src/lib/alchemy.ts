import { Alchemy, Network } from 'alchemy-sdk'

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

// Configs for each chain
const settings = {
    [1]: { apiKey: API_KEY, network: Network.ETH_MAINNET },
    [10]: { apiKey: API_KEY, network: Network.OPT_MAINNET },
    [8453]: { apiKey: API_KEY, network: Network.BASE_MAINNET },
    [42161]: { apiKey: API_KEY, network: Network.ARB_MAINNET },
    [137]: { apiKey: API_KEY, network: Network.MATIC_MAINNET },
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

export async function fetchChainTokens(chainId: number, address: string): Promise<TokenBalance[]> {
    const config = settings[chainId as keyof typeof settings]
    if (!config) return [] // Chain not supported by Alchemy or not configured

    const alchemy = new Alchemy(config)

    try {
        // Get non-zero token balances
        const balances = await alchemy.core.getTokenBalances(address)

        // Remove tokens with 0 balance
        const nonZero = balances.tokenBalances.filter(token => {
            // Basic check for zero hex
            return token.tokenBalance && token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        })

        if (nonZero.length === 0) return []

        const tokensData: TokenBalance[] = []

        // Metadata fetching in batches or parallel
        // Limit to top 20 to avoid rate limits/perf issues if wallet has 1000 shitcoins
        const topTokens = nonZero.slice(0, 20)

        await Promise.all(topTokens.map(async (token) => {
            try {
                const metadata = await alchemy.core.getTokenMetadata(token.contractAddress)

                // Calculate formatted balance
                let formatted = '0'
                if (token.tokenBalance && metadata.decimals) {
                    const balanceBigInt = BigInt(token.tokenBalance)
                    const divisor = BigInt(10 ** metadata.decimals)
                    // Simple int division for now, or use a util
                    // Let's keep it string based or use simple math
                    const val = Number(balanceBigInt) / (10 ** metadata.decimals)
                    formatted = val.toString()
                }

                tokensData.push({
                    chainId,
                    contractAddress: token.contractAddress,
                    name: metadata.name || 'Unknown',
                    symbol: metadata.symbol || '???',
                    decimals: metadata.decimals,
                    balance: token.tokenBalance || '0',
                    formatted,
                    logo: metadata.logo || undefined
                })
            } catch (err) {
                console.warn(`Failed to fetch metadata for ${token.contractAddress}`, err)
            }
        }))

        return tokensData

    } catch (error) {
        console.error(`Alchemy fetch failed for chain ${chainId}`, error)
        return []
    }
}
