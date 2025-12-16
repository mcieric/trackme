import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices } from '@/lib/api'
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
                    const balance = await getNativeBalance(address, chain)
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
                const value = parseFloat(formatEther(item.balance)) * (prices[item.symbol] || 0)
                finalBalances.push({
                    ...item,
                    formatted: formatEther(item.balance),
                    price: prices[item.symbol] || 0,
                    value,
                    name: 'Native Token',
                    logo: undefined
                })
            }

            // Add Tokens (Price set to 0 for now)
            for (const token of validTokens) {
                finalBalances.push({
                    chainId: token.chainId,
                    balance: BigInt(token.balance),
                    symbol: token.symbol,
                    formatted: token.formatted,
                    price: 0,
                    value: 0,
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
    })

    return {
        balances: query.data?.balances || [],
        totalValue: query.data?.totalValue || 0,
        isLoading: query.isLoading,
        isError: query.isError
    }
}
