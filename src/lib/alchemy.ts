import { Alchemy, Network } from 'alchemy-sdk'

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
            10: ['0x46777c76dbbe40fabb2aab99e33ce20058e76c59'], // L3 on Optimism
            8453: [
                '0x940181a94a35a4569e4529a3cdfb74e38fd98631', // AERO
                '0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59', // JESSE
                '0x9a33406165f562E16C3abD82fd1185482E01b49a', // TALENT
                '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', // cbBTC
                '0x944824290cc12f31ae18ef51216a223ba4063092', // MASA
                '0x4ed4e862860bed51a9570b96d89af5e1b0efefed', // DEGEN
                '0x532f27101965dd16442e59d40670faf5ebb142e4'  // BRETT
            ]
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

                // Fallback for AERO on Base
                if (token.contractAddress.toLowerCase() === '0x940181a94a35a4569e4529a3cdfb74e38fd98631') {
                    if (!metadata.decimals) metadata.decimals = 18
                    if (!metadata.symbol) metadata.symbol = 'AERO'
                    if (!metadata.name) metadata.name = 'Aerodrome'
                    if (!metadata.logo) metadata.logo = 'https://assets.coingecko.com/coins/images/31518/large/AERO.png'
                }

                // Fallback for JESSE
                if (token.contractAddress.toLowerCase() === '0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59') {
                    if (!metadata.symbol) metadata.symbol = 'JESSE'
                    if (!metadata.name) metadata.name = 'Jesse'
                }

                // Fallback for TALENT
                if (token.contractAddress.toLowerCase() === '0x9a33406165f562e16c3abd82fd1185482e01b49a') {
                    if (!metadata.symbol) metadata.symbol = 'TALENT'
                    if (!metadata.name) metadata.name = 'Talent Protocol'
                }

                // Fallback for cbBTC
                if (token.contractAddress.toLowerCase() === '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf') {
                    if (!metadata.symbol) metadata.symbol = 'cbBTC'
                    if (!metadata.name) metadata.name = 'Coinbase Wrapped BTC'
                }

                // Fallback for MASA
                if (token.contractAddress.toLowerCase() === '0x944824290cc12f31ae18ef51216a223ba4063092') {
                    if (!metadata.symbol) metadata.symbol = 'MASA'
                    if (!metadata.name) metadata.name = 'Masa'
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
