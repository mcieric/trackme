import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices, SYMBOL_MAP } from '@/lib/api'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { getTokensForChain } from '@/lib/token-list'

// Define interfaces for our internal data structures
interface TokenBalance {
    chainId: number
    contractAddress?: string
    balance: bigint | string
    formatted: string
    symbol: string
    name: string
    decimals: number
    logo?: string
    isNative: boolean
    price?: number
    value?: number
}

export function useWalletData(address: string) {
    const query = useQuery({
        queryKey: ['wallet-data', address],
        queryFn: async () => {
            // 1. Fetch Native Balances
            const nativePromises = SUPPORTED_CHAINS.map(async (chain) => {
                try {
                    const balance = await getNativeBalance(address, chain.id)
                    return {
                        chainId: chain.id,
                        balance,
                        symbol: chain.nativeCurrency.symbol,
                        isNative: true
                    }
                } catch (error) {
                    console.error(`Error fetching native balance for ${chain.id}:`, error)
                    return null
                }
            })

            // 2. Fetch Token Balances from Superchain List
            const tokenPromises = SUPPORTED_CHAINS.map(async (chain) => {
                try {
                    // Get tokens from the official list for this chain
                    const tokens = await getTokensForChain(chain.id)

                    if (tokens.length === 0) return []

                    const client = createPublicClient({
                        chain: chain,
                        transport: http(),
                        batch: {
                            multicall: true
                        }
                    })

                    // Fetch balances
                    const results = await Promise.all(tokens.map(async (token) => {
                        try {
                            const balance = await client.readContract({
                                address: token.address as `0x${string}`,
                                abi: erc20Abi,
                                functionName: 'balanceOf',
                                args: [address as `0x${string}`]
                            })

                            if (balance === BigInt(0)) return null

                            return {
                                chainId: chain.id,
                                contractAddress: token.address,
                                balance: balance.toString(),
                                formatted: formatUnits(balance, token.decimals),
                                symbol: token.symbol,
                                name: token.name,
                                decimals: token.decimals,
                                logo: token.logoURI
                            }
                        } catch (e) {
                            return null
                        }
                    }))

                    return results.filter((t): t is NonNullable<typeof t> => t !== null)
                } catch (error) {
                    console.error(`Error fetching tokens for chain ${chain.id}:`, error)
                    return []
                }
            })

            const [nativeResults, ...tokenResults] = await Promise.all([
                Promise.all(nativePromises),
                Promise.all(tokenPromises)
            ])

            // 3. Flatten and Merge
            const validNative = nativeResults.filter((n): n is NonNullable<typeof n> => n !== null)
            const allTokens = tokenResults.flat().flat().filter((t): t is NonNullable<typeof t> => t !== null)

            // 4. Fetch Prices
            const prices = await fetchTokenPrices()

            const finalBalances: TokenBalance[] = []

            // Add Native
            for (const item of validNative) {
                const nativeData = item.balance
                const priceId = SYMBOL_MAP[item.symbol] || item.symbol.toLowerCase()

                const chain = SUPPORTED_CHAINS.find(c => c.id === item.chainId)
                const isTestnet = chain?.testnet === true
                const unitPrice = isTestnet ? 0 : (prices[priceId]?.usd || 0)
                const value = parseFloat(nativeData.formatted) * unitPrice

                finalBalances.push({
                    chainId: item.chainId,
                    contractAddress: undefined,
                    balance: nativeData.balance,
                    symbol: item.symbol,
                    formatted: nativeData.formatted,
                    price: unitPrice,
                    value,
                    name: 'Native Token',
                    logo: undefined,
                    isNative: true,
                    decimals: chain?.nativeCurrency.decimals || 18
                })
            }

            // Add Tokens
            for (const token of allTokens) {
                const chain = SUPPORTED_CHAINS.find(c => c.id === token.chainId)
                const isTestnet = chain?.testnet === true

                // Try symbol first, then contract address fallback for price mapping
                const priceId = SYMBOL_MAP[token.symbol.toUpperCase()] || SYMBOL_MAP[token.contractAddress.toLowerCase()]
                const unitPrice = (priceId && !isTestnet) ? (prices[priceId]?.usd || 0) : 0

                const value = parseFloat(token.formatted) * unitPrice

                finalBalances.push({
                    chainId: token.chainId,
                    contractAddress: token.contractAddress,
                    balance: BigInt(token.balance),
                    symbol: token.symbol,
                    formatted: token.formatted,
                    price: unitPrice,
                    value,
                    name: token.name,
                    decimals: token.decimals,
                    logo: token.logo,
                    isNative: false
                })
            }

            // 5. Filter Dust handling
            const filteredBalances = finalBalances.filter(b => {
                const chain = SUPPORTED_CHAINS.find(c => c.id === b.chainId)
                if (chain?.testnet) return true
                return (b.value || 0) >= 0.05
            })

            const totalValue = filteredBalances.reduce((acc, curr) => acc + (curr.value || 0), 0)

            return {
                balances: filteredBalances,
                totalValue
            }
        },
        enabled: !!address && address.startsWith('0x') && address.length === 42,
        refetchInterval: 30000
    })

    return {
        balances: query.data?.balances || [],
        totalValue: query.data?.totalValue || 0,
        isLoading: query.isLoading,
        isError: query.isError
    }
}
