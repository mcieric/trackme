import { defineChain } from 'viem'
import { mainnet, optimism, base, arbitrum, polygon, linea, zora, celo, bsc, avalanche, blast, scroll, mantle } from 'viem/chains'

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
    linea,
    zora,
    celo,
    bsc,
    avalanche,
    blast,
    scroll,
    mantle,
    soneium,
] as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[number]['id']

export const CHAIN_ICONS: Record<number, string> = {
    [mainnet.id]: '/icons/ethereum.svg',
    [base.id]: '/icons/base.svg',
    [optimism.id]: '/icons/optimism.svg',
    [arbitrum.id]: '/icons/arbitrum.svg',
    [polygon.id]: '/icons/polygon.svg',
    [linea.id]: '/icons/linea.svg',
    [zora.id]: '/icons/zora.svg',
    [celo.id]: '/icons/celo.svg',
    [bsc.id]: '/icons/bsc.svg',
    [avalanche.id]: '/icons/avalanche.svg',
    [blast.id]: '/icons/blast.svg',
    [scroll.id]: '/icons/scroll.svg',
    [mantle.id]: '/icons/mantle.svg',
    [soneium.id]: '/icons/soneium.svg?v=2',
}

export function getChainName(chainId: number): string {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
    return chain ? chain.name : `Chain ${chainId}`
}
