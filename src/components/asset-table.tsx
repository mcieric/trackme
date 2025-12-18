'use client'

import { Card } from '@/components/ui/card'
import { CHAIN_ICONS, getChainName } from '@/config/chains'

interface AssetTableProps {
    balances: any[]
    selectedChain: number | null
}

export function AssetTable({ balances, selectedChain }: AssetTableProps) {
    // Filter first, then sort
    const filteredBalances = selectedChain
        ? balances.filter(b => b.chainId === selectedChain)
        : balances

    const sortedBalances = [...filteredBalances].sort((a, b) => b.value - a.value)

    return (
        <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium tracking-wider">Asset</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Price</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Balance</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Value</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-center">Chain</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Wallet</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {sortedBalances.map((item) => (
                            <tr key={`${item.walletAddress}-${item.chainId}-${item.contractAddress || item.symbol}`} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground border border-border">
                                            {item.logo ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={item.logo} alt={item.symbol} className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                item.symbol[0]
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-foreground">{item.symbol}</div>
                                            <div className="text-xs text-muted-foreground">{item.isNative ? 'Native Token' : item.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                                    {item.price && item.price > 0 ? (
                                        `$${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    ) : (
                                        <span className="opacity-40 italic text-xs">Unknown</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground">
                                    {parseFloat(item.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-foreground">
                                    {item.value && item.value > 0 ? (
                                        `$${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    ) : (
                                        <span className="opacity-40 italic text-xs">---</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div
                                        className="inline-flex items-center justify-center p-1.5 rounded-full bg-secondary/80 border border-border relative group/tooltip"
                                        title={getChainName(item.chainId)}
                                    >
                                        {CHAIN_ICONS[item.chainId] ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={CHAIN_ICONS[item.chainId]} alt="chain" className="w-4 h-4" />
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground">{item.chainId}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-[10px] text-muted-foreground opacity-70">
                                    {item.walletAddress ? (
                                        `${item.walletAddress.slice(0, 6)}...${item.walletAddress.slice(-4)}`
                                    ) : '???'}
                                </td>
                            </tr>
                        ))}
                        {sortedBalances.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                    No assets found on checked chains.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
