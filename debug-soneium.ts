
import { isAddress } from 'viem'

function isValidToken(token: any): boolean {
    if (!token || typeof token !== 'object') return false
    if (typeof token.chainId !== 'number' || token.chainId <= 0) return false
    if (typeof token.address !== 'string' || !isAddress(token.address)) return false
    if (typeof token.decimals !== 'number' || token.decimals < 0 || token.decimals > 255) return false
    if (token.logoURI) {
        if (typeof token.logoURI !== 'string') return false
        if (!token.logoURI.startsWith('http://') && !token.logoURI.startsWith('https://')) return false
    }
    return true
}

const SUPERCHAIN_TOKEN_LIST_URL = 'https://ethereum-optimism.github.io/optimism.tokenlist.json'

async function main() {
    console.log('Fetching', SUPERCHAIN_TOKEN_LIST_URL);
    try {
        const response = await fetch(SUPERCHAIN_TOKEN_LIST_URL);
        const data = await response.json();

        const soneiumTokens = data.tokens.filter((t: any) => t.chainId === 1868);
        console.log('Total Soneium (1868) tokens found:', soneiumTokens.length);

        soneiumTokens.forEach((t: any) => {
            const valid = isValidToken(t);
            console.log(`Token: ${t.symbol} (${t.address}) - Valid: ${valid}`);
            if (!valid) console.log('Invalid reason:', t);
        });

    } catch (e) {
        console.error(e);
    }
}

main();
