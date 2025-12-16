import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices, SYMBOL_MAP } from '@/lib/api'
import { fetchChainTokens } from '@/lib/alchemy'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { formatEther } from 'viem'

import { fetchBlockscoutTokens } from '@/lib/blockscout'

// Hardcoded supported alchemy chains for now to match our config
const ALCHEMY_CHAINS = [1, 10, 8453, 42161, 137]
const BLOCKSCOUT_CHAINS = [10, 8453] // Optimism and Base

export function useWalletData(address: string) {
    const query = useQuery({
        queryKey: ['wallet-data', address],
        queryFn: async () => {
            // 1. Fetch Native Balances (Existing logic)
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

            // 2. Fetch ERC20 Tokens via Alchemy (Parallel)
            const alchemyPromises = ALCHEMY_CHAINS.map(async (chainId) => {
                return await fetchChainTokens(chainId, address)
            })

            // 3. Fetch ERC20 Tokens via Blockscout (Parallel)
            const blockscoutPromises = BLOCKSCOUT_CHAINS.map(async (chainId) => {
                return await fetchBlockscoutTokens(chainId, address)
            })

            const [nativeResults, alchemyResults, blockscoutResults] = await Promise.all([
                Promise.all(nativePromises),
                Promise.all(alchemyPromises),
                Promise.all(blockscoutPromises)
            ])

            // 4. Flatten and Merge
            const validNative = nativeResults.filter(Boolean) as any[]

            // Create a Map to merge tokens by unique key (chainId + contractAddress)
            // Priority: Alchemy data (usually better metadata) -> Blockscout data
            const tokenMap = new Map<string, any>()

            // Helper to add tokens to map
            const addTokens = (tokens: any[]) => {
                for (const t of tokens) {
                    const key = `${t.chainId}-${t.contractAddress.toLowerCase()}`
                    if (!tokenMap.has(key)) {
                        tokenMap.set(key, t)
                    }
                }
            }

            // Add Alchemy first (primary source)
            addTokens(alchemyResults.flat())

            // Add Blockscout second (fill gaps)
            addTokens(blockscoutResults.flat())

            const validTokens = Array.from(tokenMap.values())

            // 5. Fetch Prices (Native + Top Tokens if possible)
            const prices = await fetchTokenPrices()

            const finalBalances = []

            // Add Native
            for (const item of validNative) {
                // item.balance is the object returned from getNativeBalance containing { balance, formatted, symbol ... }
                const nativeData = item.balance

                // Determine price ID: either direct map or fallback to symbol map (e.g. ETH)
                const priceId = SYMBOL_MAP[item.symbol] || item.symbol.toLowerCase()

                // Use nativeData.formatted which is already computed
                const unitPrice = prices[priceId]?.usd || 0
                const value = parseFloat(nativeData.formatted) * unitPrice

                finalBalances.push({
                    chainId: item.chainId,
                    contractAddress: undefined, // Native has no contract
                    balance: nativeData.balance,
                    symbol: item.symbol,
                    formatted: nativeData.formatted,
                    price: unitPrice,
                    value,
                    name: 'Native Token',
                    logo: undefined,
                    isNative: true
                })
            }

            // Add Tokens (Price set via Map)
            for (const token of validTokens) {
                // Try symbol first, then specific contract address
                const priceId = SYMBOL_MAP[token.symbol.toUpperCase()] || SYMBOL_MAP[token.contractAddress.toLowerCase()]
                const unitPrice = priceId ? (prices[priceId]?.usd || 0) : 0

                const value = parseFloat(token.formatted) * unitPrice

                finalBalances.push({
                    chainId: token.chainId,
                    balance: BigInt(token.balance),
                    symbol: token.symbol,
                    formatted: token.formatted,
                    price: unitPrice,
                    value,
                    name: token.name,
                    logo: token.logo,
                    isNative: false
                })
            }

            // 6. Filter Dust (Value < $0.05)
            const filteredBalances = finalBalances.filter(b => b.value >= 0.05)
            const totalValue = filteredBalances.reduce((acc, curr) => acc + curr.value, 0)

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
