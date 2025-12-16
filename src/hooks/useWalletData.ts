import { useQuery } from '@tanstack/react-query'
import { getNativeBalance, fetchTokenPrices, SYMBOL_MAP } from '@/lib/api'
import { fetchChainTokens } from '@/lib/alchemy'
import { SUPPORTED_CHAINS } from '@/config/chains'
import { formatEther } from 'viem'

import { fetchBlockscoutTokens } from '@/lib/blockscout'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { soneium, base } from '@/config/chains'
import { mainnet } from 'viem/chains'

// Explicit tokens to track on Soneium
const SONEIUM_TOKENS = [
    { address: '0xba9986d2381edf1da03b0b9c1f8b00dc4aacc369', symbol: 'USDC.e', decimals: 6, name: 'Bridged USDC' },
    { address: '0x2CAE934a1e84F693fbb78CA5ED3B0A6893259441', symbol: 'ASTR', decimals: 18, name: 'Astar' }
] as const

// Explicit tokens for Base (Safety Net)
const BASE_TOKENS = [
    { address: '0x532f27101965dd16442e59d40670faf5ebb142e4', symbol: 'BRETT', decimals: 18, name: 'Brett' },
    { address: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed', symbol: 'DEGEN', decimals: 18, name: 'Degen' },
    { address: '0x940181a94444545b6e4C8d2188A3983FfF38fd98631', symbol: 'AERO', decimals: 18, name: 'Aerodrome' }
] as const

// Explicit tokens for Ethereum (Safety Net)
const ETH_TOKENS = [
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
    { address: '0x514910771af9ca653ac0797bc097d294a7e9aca3', symbol: 'LINK', decimals: 18, name: 'Chainlink' },
    { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', symbol: 'UNI', decimals: 18, name: 'Uniswap' },
    { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', decimals: 18, name: 'Shiba Inu' },
    { address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', symbol: 'PEPE', decimals: 18, name: 'Pepe' }
] as const

// Hardcoded supported alchemy chains for now to match our config
const ALCHEMY_CHAINS = [1, 10, 8453, 42161, 137]
const BLOCKSCOUT_CHAINS = [1, 10, 8453, 42161, 137, 1868] // All major chains + Soneium

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

            // 4. Explicit RPC Fetch (Manual Safety Net for Soneium, Base, Eth)
            const manualRpcFetch = async (chainConfig: any, tokens: readonly any[]) => {
                try {
                    const client = createPublicClient({
                        chain: chainConfig,
                        transport: http()
                    })

                    const results = await Promise.all(tokens.map(async (token) => {
                        try {
                            const balance = await client.readContract({
                                address: token.address,
                                abi: erc20Abi,
                                functionName: 'balanceOf',
                                args: [address as `0x${string}`]
                            })

                            if (balance === 0n) return null

                            return {
                                chainId: chainConfig.id,
                                contractAddress: token.address,
                                balance: balance.toString(),
                                formatted: formatUnits(balance, token.decimals),
                                symbol: token.symbol,
                                name: token.name,
                                decimals: token.decimals,
                                logo: undefined
                            }
                        } catch (e) {
                            return null
                        }
                    }))
                    return results.filter(Boolean)
                } catch (e) {
                    return []
                }
            }

            const soneiumPromise = manualRpcFetch(soneium, SONEIUM_TOKENS)
            const basePromise = manualRpcFetch(base, BASE_TOKENS)
            const ethPromise = manualRpcFetch(mainnet, ETH_TOKENS)

            const [nativeResults, alchemyResults, blockscoutResults, soneiumTokens, baseTokens, ethTokens] = await Promise.all([
                Promise.all(nativePromises),
                Promise.all(alchemyPromises),
                Promise.all(blockscoutPromises),
                soneiumPromise,
                basePromise,
                ethPromise
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

            // Add Manual RPC tokens (High priority/fallback)
            addTokens(soneiumTokens as any[])
            addTokens(baseTokens as any[])
            addTokens(ethTokens as any[])

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
                const chain = SUPPORTED_CHAINS.find(c => c.id === item.chainId)
                const isTestnet = chain?.testnet === true
                const unitPrice = isTestnet ? 0 : (prices[priceId]?.usd || 0)
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
                const chain = SUPPORTED_CHAINS.find(c => c.id === token.chainId)
                const isTestnet = chain?.testnet === true

                const priceId = SYMBOL_MAP[token.symbol.toUpperCase()] || SYMBOL_MAP[token.contractAddress.toLowerCase()]
                const unitPrice = (priceId && !isTestnet) ? (prices[priceId]?.usd || 0) : 0

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

            // 6. Filter Dust (Value < $0.05, keep testnet tokens or manual whitelist if needed)
            // For now, if it's testnet, we keep it even if 0 value (so user can see their assets)
            const filteredBalances = finalBalances.filter(b => {
                const chain = SUPPORTED_CHAINS.find(c => c.id === b.chainId)
                if (chain?.testnet) return true
                return b.value >= 0.05
            })
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
