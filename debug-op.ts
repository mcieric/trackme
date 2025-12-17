
import { createPublicClient, http, formatUnits, erc20Abi, isAddress } from 'viem'
import { optimism } from 'viem/chains'
import { fetchSuperchainTokenList } from './src/lib/token-list'

const USER_ADDRESS = '0x88ac3d64230c8a453492ff908a02daa27e9b3429'
const CHAIN_ID = 10 // Optimism

const isValidToken = (token: any) => {
    if (!token || typeof token !== 'object') return false
    if (typeof token.chainId !== 'number' || token.chainId <= 0) return false
    if (typeof token.address !== 'string' || !isAddress(token.address)) return false
    if (typeof token.decimals !== 'number') return false
    if (token.logoURI && (!token.logoURI.startsWith('http://') && !token.logoURI.startsWith('https://'))) return false
    return true
}

async function debug() {
    console.log('--- Debugging Optimism (Chain ID 10) ---')

    // 1. Check Token List
    console.log('1. Fetching Token List...')
    try {
        const fullList = await fetchSuperchainTokenList()
        const opTokens = fullList.tokens.filter(t => t.chainId === CHAIN_ID)
        console.log(`Found ${opTokens.length} tokens for Optimism in the raw list.`)

        const validOpTokens = opTokens.filter(isValidToken)
        console.log(`Found ${validOpTokens.length} VALID tokens for Optimism after validation.`)

        if (validOpTokens.length > 0) {
            console.log('Sample Token:', validOpTokens[0])
        }
    } catch (e) {
        console.error('Error fetching token list:', e)
    }

    // 2. Check Native Balance (RPC connectivity)
    console.log('\n2. Checking Native Balance via Public RPC...')
    try {
        const client = createPublicClient({
            chain: optimism,
            transport: http()
        })
        const balance = await client.getBalance({ address: USER_ADDRESS as `0x${string}` })
        console.log(`Native Balance (ETH): ${formatUnits(balance, 18)}`)
    } catch (e) {
        console.error('Error fetching native balance:', e)
    }

    // 3. Check Token Balances (Sample)
    console.log('\n3. Checking Token Balances (USDC/OP)...')
    // Known addresses on OP
    const USDC = '0x0b2c639c533813f4aa9d7837caf992837bd5787f' // Bridged USDC standard
    const OP = '0x4200000000000000000000000000000000000042'

    const client = createPublicClient({
        chain: optimism,
        transport: http()
    })

    const checkToken = async (address: string, symbol: string) => {
        try {
            const balance = await client.readContract({
                address: address as `0x${string}`,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [USER_ADDRESS as `0x${string}`]
            })
            console.log(`${symbol} Balance: ${formatUnits(balance, 6)} (assuming 6 decimals for simplicity, check actual)`)
        } catch (e) {
            console.error(`Error fetching ${symbol}:`, e)
        }
    }

    await checkToken(USDC, 'USDC')
    await checkToken(OP, 'OP')
}

debug()
