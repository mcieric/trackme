import { Alchemy, Network } from 'alchemy-sdk'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Mocking the environment variable for local execution
const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || 'demo'
const ADDRESS = '0x88ac3d64230c8a453492ff908a02daa27e9b3429'
const CHAIN_ID = 8453 // Base

async function main() {
    console.log(`Checking tokens for ${ADDRESS} on Base (${CHAIN_ID})...`)
    const config = {
        apiKey: API_KEY,
        network: Network.BASE_MAINNET,
    }
    const alchemy = new Alchemy(config)

    try {
        const balances = await alchemy.core.getTokenBalances(ADDRESS)
        console.log(`Found ${balances.tokenBalances.length} token balances`)

        const nonZero = balances.tokenBalances.filter(token => {
            return token.tokenBalance && token.tokenBalance !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        })
        console.log(`Found ${nonZero.length} non-zero token balances`)

        for (const token of nonZero) {
            const metadata = await alchemy.core.getTokenMetadata(token.contractAddress)
            let formatted = '0'
            if (token.tokenBalance && metadata.decimals) {
                const balanceBigInt = BigInt(token.tokenBalance)
                const divisor = BigInt(10 ** metadata.decimals)
                // Use simple division for debug
                const val = Number(balanceBigInt) / Number(divisor)
                formatted = val.toString()
            }

            // Log specific tokens we are interested in
            if (['AERO', 'JESSE', 'TALENT', 'cbBTC', 'MASA'].includes(metadata.symbol || '')) {
                console.log(`MATCH FOUND: Symbol: ${metadata.symbol}, Address: ${token.contractAddress}, Balance: ${formatted}`)
            } else {
                // Log all for now just in case symbol is different
                // console.log(`Token: ${metadata.symbol}, Address: ${token.contractAddress}, Balance: ${formatted}`)
            }

            // Special check for AERO if symbol match fails
            if (token.contractAddress.toLowerCase() === '0x940181a94a35a4569e4529a3cdfb74e38fd98631') {
                console.log(`AERO ADDRESS MATCH: Symbol: ${metadata.symbol}, Balance: ${formatted}`)
            }
        }

    } catch (error) {
        console.error('Error:', error)
    }
}

main()
