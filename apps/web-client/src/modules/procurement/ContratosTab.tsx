import React from 'react';

interface Contrato {
    id: number;
    numero: string;
    fornecedor: string;
    valor_inicial_cents: number;
    vigencia_inicio: string;
    vigencia_fim: string;
    status: string;
}

export const ContratosTab: React.FC<{ contratos: Contrato[] }> = ({ contratos }) => {
    return (
        <div className="bg-white border border-[#E1E3E6] rounded-xl p-6">
            <h3 className="text-lg font-bold text-[#0a1128] mb-4 font-mono">Contratos Administrativos</h3>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[#E1E3E6] text-left text-[#6B6B6B] uppercase text-[10px] font-bold">
                        <th className="py-2 font-mono">Nº Contrato</th>
                        <th className="py-2 font-mono">Fornecedor</th>
                        <th className="py-2 font-mono text-right">Valor Inicial</th>
                        <th className="py-2 font-mono">Vigência</th>
                        <th className="py-2 font-mono">Status</th>
                    </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                    {contratos.map(c => (
                        <tr key={c.id} className="border-b border-[#F5F6F8]">
                            <td className="py-2">{c.numero}</td>
                            <td className="py-2">{c.fornecedor}</td>
                            <td className="py-2 text-right">R$ {(c.valor_inicial_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2">{c.vigencia_inicio} a {c.vigencia_fim}</td>
                            <td className="py-2"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">{c.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
