import { defineChain } from 'viem'
import { mainnet, optimism, base, arbitrum, polygon } from 'viem/chains'

// Soneium Minato Testnet (Example configuration, adjust if Mainnet is available/needed)
export const soneium = defineChain({
    id: 1868,
    name: 'Soneium Minato',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['https://rpc.minato.soneium.org/'] },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: 'https://explorer-testnet.soneium.org' },
    },
    testnet: true,
})

export const SUPPORTED_CHAINS = [
    mainnet,
    base,
    optimism,
    arbitrum,
    polygon,
    soneium,
] as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[number]['id']

export const CHAIN_ICONS: Record<number, string> = {
    [mainnet.id]: '/icons/ethereum.svg',
    [base.id]: '/icons/base.svg',
    [optimism.id]: '/icons/optimism.svg',
    [arbitrum.id]: '/icons/arbitrum.svg',
    [polygon.id]: '/icons/polygon.svg',
    [soneium.id]: '/icons/soneium.svg',
}
