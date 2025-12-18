import { createPublicClient, http, fallback, formatUnits } from 'viem'
import { SUPPORTED_CHAINS, SupportedChainId } from '@/config/chains'

const COINGECKO_IDS = [
    'ethereum',
    'optimism',
    'base',
    'arbitrum',
    'matic-network',
    'velodrome-finance',
    'usd-coin',
    'tether',
    'wrapped-bitcoin',
    'layer3',
    'astar',
    'stargate-finance',
    'aerodrome-finance',
    'degen-base',
    'based-brett',
    'chainlink',
    'uniswap',
    'aave',
    'curve-dao-token',
    'maker',
    'compound-governance-token',
    'lido-dao',
    'rocket-pool',
    'frax',
    'ethena-usde',
    'gmx',
    'magic',
    'radiant-capital',
    'seamless-protocol',
    'moonwell',
    'prime',
    'pepe',
    'shiba-inu',
    'dogecoin',
    'dogwifhat',
    'bonk',
    // New Chains support
    'renzo-restaked-eth',
    'stakestone-ether',
    'rs-eth',
    'celo',
    'celo-dollar',
    'celo-euro',
    'enjoy',
    'toshi',
    'echelon-prime',
    'virtual-protocol',
    'axelar',
    'balancer',
    'sushi',
    'tether-gold',
    'sweat-economy',
    'glo-dollar',
    'gooddollar',
    'ubeswap',
    'linea',
    'trusta-ai',
    'linea-bridged-wsteth',
    'zerolend',
    'wrapped-staked-eth',
    'jesse',
    'talent-protocol',
    'coinbase-wrapped-btc',
    'masa',
    'altlayer',
    'azuro-protocol'
]

// Simple mapping for demo
export const SYMBOL_MAP: Record<string, string> = {
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'ALT': 'altlayer',
    'AZUR': 'azuro-protocol',
    'OP': 'optimism',
    'VELO': 'velodrome-finance',
    'VELO V2': 'velodrome-finance',
    'VELO(V2)': 'velodrome-finance',
    'USDC.E': 'usd-coin',
    'ASTR': 'astar',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'ARB': 'arbitrum',
    'MATIC': 'matic-network',
    'POL': 'matic-network',
    'WBTC': 'wrapped-bitcoin',
    'L3': 'layer3',
    'STG': 'stargate-finance',
    'AERO': 'aerodrome-finance',
    'DEGEN': 'degen-base',
    'BRETT': 'based-brett',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave',
    'CRV': 'curve-dao-token',
    'MKR': 'maker',
    'COMP': 'compound-governance-token',
    'LDO': 'lido-dao',
    'RPL': 'rocket-pool',
    'FRAX': 'frax',
    'USDe': 'ethena-usde',
    'GMX': 'gmx',
    'MAGIC': 'magic',
    'RDNT': 'radiant-capital',
    'SEAM': 'seamless-protocol',
    'WELL': 'moonwell',
    'PEPE': 'pepe',
    'SHIB': 'shiba-inu',
    'DOGE': 'dogecoin',
    'WIF': 'dogwifhat',
    'BONK': 'bonk',
    'EZETH': 'renzo-restaked-eth',
    'STONE': 'stakestone-ether',
    'WRSETH': 'rs-eth',
    'LINEA': 'linea',
    'TA': 'trusta-ai',
    'WSTETH': 'wrapped-staked-eth',
    'ZERO': 'zerolend',
    'CELO': 'celo',
    'CUSD': 'celo-dollar',
    'CEUR': 'celo-euro',
    'ENJOY': 'enjoy',
    'TOSHI': 'toshi',
    'PRIME': 'echelon-prime',
    'VIRTUAL': 'virtual-protocol',
    'BAL': 'balancer',
    'SUSHI': 'sushi',
    'XAUT': 'tether-gold',
    'SWEAT': 'sweat-economy',
    'JESSE': 'jesse',
    'TALENT': 'talent-protocol',
    'CBBTC': 'coinbase-wrapped-btc',
    'MASA': 'masa',
    'USDGLO': 'glo-dollar',
    'G$': 'gooddollar',
    'UBE': 'ubeswap',
    // Contract Addresses for robustness
    '0x9560e827af36c94d2ac33a39bce1fe78631088db': 'velodrome-finance',
    '0xb5bedd42000b71fdde22d3ee8a79bd49a568fc8f': 'linea-bridged-wsteth',
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': 'aerodrome-finance',
    '0x4200000000000000000000000000000000000042': 'optimism',
    '0x0b2c639c43a23f2514f79435a28821c062ce01d8': 'usd-coin', // USDC on OP
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin', // USDC on Base
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'usd-coin', // USDC on Arb
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'usd-coin', // USDC on Polygon
    '0x066ba6f91753c15320984852033bc883ce75d56d': 'trusta-ai'
}

export const SCAM_TOKENS = new Set([
    'ABTC',
    'REKT',
    'THOR', // There are many fake THOR tokens
    'CREATE',
    'MUMMY',
])

export async function fetchTokenPrices(customIds?: string[]) {
    try {
        const ids = customIds && customIds.length > 0 ? customIds.join(',') : COINGECKO_IDS.join(',')
        const response = await fetch(`/api/prices?ids=${ids}`)

        if (!response.ok) throw new Error('Failed to fetch prices')

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching prices:', error)
        return {}
    }
}

export async function getNativeBalance(address: string, chainId: SupportedChainId) {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    if (!chain) throw new Error('Chain not supported')

    const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

    // Use Alchemy RPC if available and chain is supported, otherwise default
    const ALCHEMY_NETWORKS: Record<number, string> = {
        1: 'eth-mainnet',
        10: 'opt-mainnet',
        8453: 'base-mainnet',
        42161: 'arb-mainnet',
        137: 'polygon-mainnet',
        59144: 'linea-mainnet',
        7777777: 'zora-mainnet'
    }

    const transports = []

    if (API_KEY && ALCHEMY_NETWORKS[chainId]) {
        transports.push(http(`https://${ALCHEMY_NETWORKS[chainId]}.g.alchemy.com/v2/${API_KEY}`))
    }
    // Always add default http transport as fallback
    transports.push(http())

    const client = createPublicClient({
        chain,
        transport: fallback(transports)
    })

    try {
        const balance = await client.getBalance({ address: address as `0x${string}` })
        return {
            chainId,
            balance: balance,
            formatted: formatUnits(balance, chain.nativeCurrency.decimals),
            symbol: chain.nativeCurrency.symbol
        }
    } catch (error) {
        console.error(`Error fetching balance for ${chain.name}:`, error)
        return {
            chainId,
            balance: BigInt(0),
            formatted: '0',
            symbol: chain.nativeCurrency.symbol
        }
    }
}
