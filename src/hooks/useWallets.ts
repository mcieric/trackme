'use client'

import { useWalletContext } from '@/context/WalletContext'

export type { WalletInfo } from '@/context/WalletContext'

export function useWallets() {
    return useWalletContext()
}
