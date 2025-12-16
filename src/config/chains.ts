import { defineChain } from 'viem'
import { mainnet, optimism, base, arbitrum, polygon } from 'viem/chains'

// Soneium Mainnet
export const soneium = defineChain({
    id: 1868,
    name: 'Soneium',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['https://rpc.soneium.org'] },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: 'https://soneium.blockscout.com' },
    },
    testnet: false,
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
    [soneium.id]: '/icons/soneium.svg?v=2',
}

export function getChainName(chainId: number): string {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    return chain ? chain.name : `Chain ${chainId}`
}
