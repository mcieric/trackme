import { isAddress } from 'viem'

export interface TokenListToken {
    chainId: number
    address: string
    name: string
    symbol: string
    decimals: number
    logoURI?: string
    extensions?: {
        opTokenId?: string
        [key: string]: any
    }
}

export interface TokenList {
    name: string
    logoURI: string
    keywords: string[]
    timestamp: string
    tokens: TokenListToken[]
}

const SUPERCHAIN_TOKEN_LIST_URL = 'https://raw.githubusercontent.com/superbridgeapp/token-lists/main/superchain.tokenlist.json'

let cachedTokenList: TokenList | null = null

// Basic sanitation and validation
function isValidToken(token: any): token is TokenListToken {
    if (!token || typeof token !== 'object') return false

    // 1. Validate ChainID
    if (typeof token.chainId !== 'number' || token.chainId <= 0) return false

    // 2. Validate Address
    if (typeof token.address !== 'string' || !isAddress(token.address)) return false

    // 3. Validate Decimals
    if (typeof token.decimals !== 'number' || token.decimals < 0 || token.decimals > 255) return false

    // 4. Sanitize/Validate LogoURI if present
    if (token.logoURI) {
        if (typeof token.logoURI !== 'string') return false
        // Only allow http/https protocols to prevent XSS via javascript: or data: quirks
        if (!token.logoURI.startsWith('http://') && !token.logoURI.startsWith('https://')) {
            return false
        }
    }

    return true
}

export async function fetchSuperchainTokenList(): Promise<TokenList> {
    if (cachedTokenList) return cachedTokenList

    try {
        const response = await fetch(SUPERCHAIN_TOKEN_LIST_URL)
        if (!response.ok) {
            throw new Error(`Failed to fetch token list: ${response.statusText}`)
        }
        const data = await response.json()

        // Validate tokens before returning
        // We filter out invalid tokens to ensure app stability
        const validTokens = Array.isArray(data.tokens) ? data.tokens.filter(isValidToken) : []

        const sanitizedList = {
            ...data,
            tokens: validTokens
        }

        cachedTokenList = sanitizedList
        return sanitizedList as TokenList
    } catch (error) {
        console.error('Error fetching Superchain token list:', error)
        return {
            name: 'Fallback',
            logoURI: '',
            keywords: [],
            timestamp: new Date().toISOString(),
            tokens: []
        }
    }
}

export async function getTokensForChain(chainId: number): Promise<TokenListToken[]> {
    const list = await fetchSuperchainTokenList()
    return list.tokens.filter(t => t.chainId === chainId)
}
