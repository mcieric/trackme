'use client'

import { Card } from '@/components/ui/card'
import { CHAIN_ICONS } from '@/config/chains'

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
        <Card className="overflow-hidden border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-medium tracking-wider">Asset</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Price</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Balance</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-right">Value</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-center">Chain</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {sortedBalances.map((item) => (
                            <tr key={`${item.chainId}-${item.symbol}`} className="hover:bg-zinc-800/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white border border-zinc-700">
                                            {item.symbol[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{item.symbol}</div>
                                            <div className="text-xs text-zinc-500">Native Token</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-300">
                                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-zinc-300">
                                    {parseFloat(item.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-white">
                                    ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50">
                                        {CHAIN_ICONS[item.chainId] ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={CHAIN_ICONS[item.chainId]} alt="chain" className="w-4 h-4" />
                                        ) : (
                                            <span className="text-[10px]">{item.chainId}</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedBalances.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
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
