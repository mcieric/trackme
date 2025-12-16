import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices, SYMBOL_MAP } from '@/lib/api'
import { fetchChainTokens } from '@/lib/alchemy'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { formatEther } from 'viem'

// Hardcoded supported alchemy chains for now to match our config
const ALCHEMY_CHAINS = [1, 10, 8453, 42161, 137]

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
            const tokenPromises = ALCHEMY_CHAINS.map(async (chainId) => {
                return await fetchChainTokens(chainId, address)
            })

            const [nativeResults, tokenResults] = await Promise.all([
                Promise.all(nativePromises),
                Promise.all(tokenPromises)
            ])

            // 3. Flatten and Process
            const validNative = nativeResults.filter(Boolean) as any[]
            const validTokens = tokenResults.flat()

            // 4. Fetch Prices (Native + Top Tokens if possible)
            const prices = await fetchTokenPrices()

            const finalBalances = []

            // Add Native
            for (const item of validNative) {
                // Determine price ID: either direct map or fallback to symbol map (e.g. ETH)
                const priceId = SYMBOL_MAP[item.symbol] || item.symbol.toLowerCase()
                // CoinGecko structure is { "ethereum": { "usd": 3000 } } or flat { "ethereum": 3000 } depending on endpoint?
                // Our api.ts calls simple/price?ids=...&vs_currencies=usd -> returns { "ethereum": { "usd": 3200 } }

                const unitPrice = prices[priceId]?.usd || 0
                const value = parseFloat(formatEther(item.balance)) * unitPrice

                finalBalances.push({
                    ...item,
                    formatted: formatEther(item.balance),
                    price: unitPrice,
                    value,
                    name: 'Native Token',
                    logo: undefined
                })
            }

            // Add Tokens (Price set via Map)
            for (const token of validTokens) {
                const priceId = SYMBOL_MAP[token.symbol.toUpperCase()]
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

            const totalValue = finalBalances.reduce((acc, curr) => acc + curr.value, 0)

            return {
                balances: finalBalances,
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
