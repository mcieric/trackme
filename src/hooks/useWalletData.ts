import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices, SYMBOL_MAP, SCAM_TOKENS } from '@/lib/api'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { fetchChainTokens, isAlchemySupported } from '@/lib/alchemy'
import { fetchBlockscoutTokens, isBlockscoutSupported } from '@/lib/blockscout'
import { getTokensForChain } from '@/lib/token-list'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'

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
    walletAddress: string
}

export function useWalletData(addresses: string | string[]) {
    const addressList = Array.isArray(addresses) ? addresses : [addresses]
    const validAddresses = addressList.filter(a => a && a.startsWith('0x') && a.length === 42)

    console.log('useWalletData input addresses:', addresses)
    console.log('useWalletData valid addresses:', validAddresses)

    const query = useQuery({
        queryKey: ['wallet-data', validAddresses],
        queryFn: async () => {
            console.log('Fetching data for addresses:', validAddresses)

            // 1. Fetch Balances First (Phase 1)
            const allBalancesResults = await Promise.all(validAddresses.map(async (address) => {
                // Fetch Native Balances
                const nativePromises = SUPPORTED_CHAINS.map(async (chain) => {
                    try {
                        const balance = await getNativeBalance(address, chain.id)
                        return {
                            chainId: chain.id,
                            balance,
                            symbol: chain.nativeCurrency.symbol,
                            isNative: true,
                            walletAddress: address
                        }
                    } catch (error) {
                        return null
                    }
                })

                // Fetch Token Balances
                const tokenPromises = SUPPORTED_CHAINS.map(async (chain) => {
                    try {
                        let tokens: any[] = []

                        // 1. Try Alchemy first with timeout
                        if (isAlchemySupported(chain.id)) {
                            try {
                                // Add a 5s timeout to keep the app snappy
                                const alchemyPromise = fetchChainTokens(chain.id, address)
                                const timeoutPromise = new Promise<any[]>((_, reject) =>
                                    setTimeout(() => reject(new Error('Alchemy Timeout')), 5000)
                                )

                                tokens = await Promise.race([alchemyPromise, timeoutPromise])
                                if (tokens.length > 0) {
                                    return tokens.map(t => ({ ...t, walletAddress: address }))
                                }
                            } catch (e) {
                                console.warn(`[useWalletData] Alchemy passed for chain ${chain.id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
                            }
                        }

                        // 2. Try Blockscout as fallback
                        if (isBlockscoutSupported(chain.id)) {
                            try {
                                const results = await fetchBlockscoutTokens(chain.id, address)
                                if (results.length > 0) {
                                    return results.map(t => ({ ...t, walletAddress: address }))
                                }
                            } catch (e) {
                                console.warn(`[useWalletData] Blockscout fallback failed for chain ${chain.id}`)
                            }
                        }

                        // 3. Manual Direct RPC Scanning
                        const manualTokens = await getTokensForChain(chain.id)
                        if (manualTokens.length === 0) return []

                        const client = createPublicClient({
                            chain: chain,
                            transport: http(),
                            batch: { multicall: true }
                        })

                        const results = await Promise.all(manualTokens.map(async (token) => {
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
                                    logo: token.logoURI,
                                    walletAddress: address
                                }
                            } catch (e) {
                                return null
                            }
                        }))
                        return results.filter((t): t is NonNullable<typeof t> => t !== null) as any[]
                    } catch (error) {
                        return []
                    }
                })

                const [nativeResults, tokenResults] = await Promise.all([
                    Promise.all(nativePromises),
                    Promise.all(tokenPromises)
                ])

                return {
                    native: nativeResults.filter((n): n is NonNullable<typeof n> => n !== null),
                    tokens: tokenResults.flat().filter((t): t is NonNullable<typeof t> => t !== null) as any[]
                }
            }))

            const allNative = allBalancesResults.flatMap(r => r.native)
            const allTokens = allBalancesResults.flatMap(r => r.tokens)

            // 2. Identify Unique Price IDs (Phase 2)
            const priceIdsSet = new Set<string>()
            allNative.forEach(n => {
                const id = SYMBOL_MAP[n.symbol] || n.symbol.toLowerCase()
                if (id) priceIdsSet.add(id)
            })
            allTokens.forEach(t => {
                if (SCAM_TOKENS.has(t.symbol.toUpperCase())) return
                const id = SYMBOL_MAP[t.contractAddress?.toLowerCase() || ''] || SYMBOL_MAP[t.symbol.toUpperCase()]
                if (id) priceIdsSet.add(id)
            })

            // 3. Fetch Prices for discovered tokens
            const prices = await fetchTokenPrices(Array.from(priceIdsSet))

            // 4. Map everything together (Phase 3)
            const walletBalances: TokenBalance[] = []

            // Process Native
            for (const item of allNative) {
                const chain = SUPPORTED_CHAINS.find(c => c.id === item.chainId)
                const priceId = SYMBOL_MAP[item.symbol] || item.symbol.toLowerCase()
                const unitPrice = chain?.testnet ? 0 : (prices[priceId]?.usd || 0)
                const value = parseFloat(item.balance.formatted) * unitPrice

                walletBalances.push({
                    chainId: item.chainId,
                    contractAddress: undefined,
                    balance: item.balance.balance,
                    symbol: item.symbol,
                    formatted: item.balance.formatted,
                    price: unitPrice,
                    value,
                    name: 'Native Token',
                    logo: undefined,
                    isNative: true,
                    decimals: chain?.nativeCurrency.decimals || 18,
                    walletAddress: item.walletAddress
                })
            }

            // Process Tokens
            for (const token of allTokens) {
                const chain = SUPPORTED_CHAINS.find(c => c.id === token.chainId)
                const isScam = SCAM_TOKENS.has(token.symbol.toUpperCase())
                const priceId = isScam ? null : (SYMBOL_MAP[token.contractAddress?.toLowerCase() || ''] || SYMBOL_MAP[token.symbol.toUpperCase()])
                const unitPrice = (priceId && !chain?.testnet) ? (prices[priceId]?.usd || 0) : 0
                const value = parseFloat(token.formatted) * unitPrice

                walletBalances.push({
                    chainId: token.chainId,
                    contractAddress: token.contractAddress,
                    balance: token.balance.toString(),
                    symbol: token.symbol,
                    formatted: token.formatted,
                    price: unitPrice,
                    value,
                    name: token.name,
                    decimals: token.decimals || 18,
                    logo: token.logo,
                    isNative: false,
                    walletAddress: token.walletAddress
                })
            }

            // Final filtering and aggregation
            const finalBalances = walletBalances.filter(b => {
                const balanceNum = parseFloat(b.formatted)
                if (balanceNum === 0) return false
                if (b.price && b.price > 0) return (b.value || 0) >= 0.01
                return true
            })

            const totalValue = finalBalances.reduce((acc, curr) => acc + (curr.value || 0), 0)

            return {
                balances: finalBalances,
                totalValue
            }
        },
        enabled: validAddresses.length > 0,
        refetchInterval: 60000
    })

    return {
        balances: query.data?.balances || [],
        totalValue: query.data?.totalValue || 0,
        isLoading: query.isLoading,
        isError: query.isError
    }
}
