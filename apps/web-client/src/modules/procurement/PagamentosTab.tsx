import React from 'react';

interface Pagamento {
    id: number;
    nota_fiscal: string;
    valor_cents: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
}

const LIMITE_DIAS = 30;

export const PagamentosTab: React.FC<{ pagamentos: Pagamento[] }> = ({ pagamentos }) => {
    const hoje = new Date();

    const checkPrazo = (vencimento: string, pagamento: string | null) => {
        const venc = new Date(vencimento);
        const ref = pagamento ? new Date(pagamento) : hoje;
        const diff = Math.floor((ref.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
        return diff > LIMITE_DIAS;
    };

    return (
        <div className="bg-white border border-[#E1E3E6] rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#0a1128] mb-4 font-mono">Liquidação & Pagamentos</h3>

            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[#E1E3E6] text-left text-[#6B6B6B] uppercase text-[10px] font-bold">
                        <th className="py-2 font-mono">Nota Fiscal</th>
                        <th className="py-2 font-mono text-right">Valor</th>
                        <th className="py-2 font-mono">Vencimento</th>
                        <th className="py-2 font-mono">Pagamento</th>
                        <th className="py-2 font-mono">Status</th>
                    </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                    {pagamentos.map(p => {
                        const prazoExcedido = checkPrazo(p.data_vencimento, p.data_pagamento);
                        return (
                            <tr key={p.id} className="border-b border-[#F5F6F8]">
                                <td className="py-2">{p.nota_fiscal}</td>
                                <td className="py-2 text-right">R$ {(p.valor_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2">{p.data_vencimento}</td>
                                <td className="py-2">{p.data_pagamento ?? '—'}</td>
                                <td className="py-2">
                                    {prazoExcedido ? (
                                        <span className="px-2 py-0.5 rounded bg-[#B71C1C] text-white font-bold">RN-008: +{LIMITE_DIAS}d</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{p.status}</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
