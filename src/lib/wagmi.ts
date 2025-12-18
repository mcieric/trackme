import { http, createConfig } from 'wagmi'
import { mainnet, base, optimism, arbitrum, polygon, celo } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
    chains: [mainnet, base, optimism, arbitrum, polygon, celo],
    connectors: [
        injected(),
    ],
    transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [optimism.id]: http(),
        [arbitrum.id]: http(),
        [polygon.id]: http(),
        [celo.id]: http(),
    },
})
