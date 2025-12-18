'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface WalletInfo {
    address: string
    name: string
    isVerified: boolean
    addedAt: number
}

interface WalletContextType {
    wallets: WalletInfo[]
    addWallet: (address: string, name?: string) => void
    removeWallet: (address: string) => void
    renameWallet: (address: string, newName: string) => void
    setVerified: (address: string, verified: boolean) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const STORAGE_KEY = 'trackme-wallets'

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [wallets, setWallets] = useState<WalletInfo[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setWallets(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse saved wallets", e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Sync to localStorage
    const saveWallets = useCallback((newWallets: WalletInfo[]) => {
        setWallets(newWallets)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newWallets))
    }, [])

    const addWallet = useCallback((address: string, name?: string) => {
        setWallets(prev => {
            const normalized = address.toLowerCase()
            if (prev.some(w => w.address.toLowerCase() === normalized)) return prev

            const newWallet: WalletInfo = {
                address,
                name: name || `Wallet ${prev.length + 1}`,
                isVerified: false,
                addedAt: Date.now()
            }
            const updated = [...prev, newWallet]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const removeWallet = useCallback((address: string) => {
        setWallets(prev => {
            const updated = prev.filter(w => w.address.toLowerCase() !== address.toLowerCase())
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const renameWallet = useCallback((address: string, newName: string) => {
        setWallets(prev => {
            const updated = prev.map(w =>
                w.address.toLowerCase() === address.toLowerCase() ? { ...w, name: newName } : w
            )
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    const setVerified = useCallback((address: string, verified: boolean) => {
        setWallets(prev => {
            const updated = prev.map(w =>
                w.address.toLowerCase() === address.toLowerCase() ? { ...w, isVerified: verified } : w
            )
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    return (
        <WalletContext.Provider value={{ wallets, addWallet, removeWallet, renameWallet, setVerified }}>
            {children}
        </WalletContext.Provider>
    )
}

export function useWalletContext() {
    const context = useContext(WalletContext)
    if (context === undefined) {
        throw new Error('useWalletContext must be used within a WalletProvider')
    }
    return context
}
