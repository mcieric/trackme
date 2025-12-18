'use client'

import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { Wallet, Plus, X, CheckCircle2, ShieldCheck, Trash2, Edit2, Zap } from 'lucide-react'
import { WalletInfo, useWallets } from '@/hooks/useWallets'
import { cn } from '@/lib/utils'

export function WalletManager({ onUpdate }: { onUpdate?: () => void }) {
    const { wallets, addWallet, removeWallet, renameWallet, setVerified } = useWallets()
    const { address: connectedAddress, isConnected } = useAccount()
    const { connect, connectors } = useConnect()
    const { disconnect } = useDisconnect()
    const { signMessageAsync } = useSignMessage()

    const [inputValue, setInputValue] = useState('')
    const [editingAddress, setEditingAddress] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const handleAddManual = (e: React.FormEvent) => {
        e.preventDefault()
        if (inputValue.startsWith('0x') && inputValue.length === 42) {
            addWallet(inputValue)
            setInputValue('')
            onUpdate?.()
        }
    }

    const handleConnect = () => {
        const connector = connectors[0] // Typically Injected (Rabby/MetaMask)
        if (connector) {
            connect({ connector })
        }
    }

    const handleAddConnected = () => {
        if (connectedAddress) {
            addWallet(connectedAddress, "My Connected Wallet")
            onUpdate?.()
        }
    }

    const handleVerify = async (address: string) => {
        try {
            const message = `Verify ownership of ${address} on TrackMe\nTimestamp: ${Date.now()}`
            await signMessageAsync({ message })
            setVerified(address, true)
            onUpdate?.()
        } catch (e) {
            console.error("Signature failed", e)
        }
    }

    const startEditing = (wallet: WalletInfo) => {
        setEditingAddress(wallet.address)
        setEditName(wallet.name)
    }

    const saveName = () => {
        if (editingAddress) {
            renameWallet(editingAddress, editName)
            setEditingAddress(null)
        }
    }

    return (
        <div className="flex flex-col gap-6 p-6 bg-card border border-border rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    Wallets Management
                </h3>
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-mono font-bold">
                                {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
                            </span>
                            <button
                                onClick={() => handleAddConnected()}
                                className="ml-2 p-1 hover:bg-primary/20 rounded-md transition-colors"
                                title="Add to dashboard"
                            >
                                <Plus className="w-3 h-3 text-primary" />
                            </button>
                            <button
                                onClick={() => disconnect()}
                                className="p-1 hover:bg-destructive/10 rounded-md transition-colors"
                            >
                                <X className="w-3 h-3 text-destructive" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            Scan Connected Wallet
                        </button>
                    )}
                </div>
            </div>

            {/* Manual Add */}
            <form onSubmit={handleAddManual} className="flex gap-2">
                <input
                    type="text"
                    placeholder="Paste another EVM address (0x...)"
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-border"
                >
                    Add
                </button>
            </form>

            {/* List */}
            <div className="flex flex-col gap-3">
                {wallets.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm italic">
                        No addresses added yet. Scan or paste an address to start.
                    </div>
                )}
                {wallets.map((wallet) => (
                    <div
                        key={wallet.address}
                        className="group flex items-center justify-between p-4 bg-background/50 border border-border rounded-xl hover:border-primary/30 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center border bg-muted border-border">
                                <Wallet className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{wallet.name}</span>
                                <span className="text-xs font-mono text-muted-foreground opacity-70">
                                    {wallet.address}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => removeWallet(wallet.address)}
                                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
