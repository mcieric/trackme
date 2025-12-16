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

        const tokensData: TokenBalance[] = []
        // Limit to top 500 to capture more assets (user has >300 tokens)
        const topTokens = nonZero.slice(0, 500)

        // Force check specific tokens that might be missed (e.g. L3 on Optimism)
        // We fetch these explicitly to ensure they are found even if Alchemy main call misses them
        const PRIORITY_TOKENS: Record<number, string[]> = {
            10: ['0x46777c76dbbe40fabb2aab99e33ce20058e76c59'] // L3 on Optimism
        }

        const priorityList = PRIORITY_TOKENS[chainId] || []

        if (priorityList.length > 0) {
            try {
                // Fetch priority tokens separately
                const priorityBalances = await alchemy.core.getTokenBalances(address, priorityList)

                for (const pToken of priorityBalances.tokenBalances) {
                    // Check if already in topTokens
                    const exists = topTokens.find(t => t.contractAddress.toLowerCase() === pToken.contractAddress.toLowerCase())
                    // If not present and has balance
                    if (!exists && pToken.tokenBalance && pToken.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        topTokens.push(pToken)
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch priority tokens for chain ${chainId}`, err)
            }
        }

        await Promise.all(topTokens.map(async (token) => {
            try {
                let metadata = await alchemy.core.getTokenMetadata(token.contractAddress)

                // Fallback for known broken metadata (e.g. L3 on Optimism)
                if (token.contractAddress.toLowerCase() === '0x46777c76dbbe40fabb2aab99e33ce20058e76c59') {
                    if (!metadata.decimals) metadata.decimals = 18
                    if (!metadata.symbol) metadata.symbol = 'L3'
                    if (!metadata.name) metadata.name = 'Layer3'
                }

                // Calculate formatted balance
                let formatted = '0'
                if (token.tokenBalance && metadata.decimals) {
                    const balanceBigInt = BigInt(token.tokenBalance)
                    const divisor = BigInt(10 ** metadata.decimals)
                    const val = Number(balanceBigInt) / Number(divisor)
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
