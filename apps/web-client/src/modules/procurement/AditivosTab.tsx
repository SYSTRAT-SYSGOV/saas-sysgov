import React, { useState } from 'react';

interface Aditivo {
    id: number;
    numero: string;
    tipo: string;
    valor_cents: number;
    percentual_acumulado: number;
    status: string;
}

// RN-009: Limite padrão 25%, 50% para obras/reformas
const LIMITE_PERCENTUAL = 25;

export const AditivosTab: React.FC<{ valorInicialCents: number; aditivos: Aditivo[] }> = ({ valorInicialCents, aditivos }) => {
    const [percentual, setPercentual] = useState(0);

    const limiteCents = (valorInicialCents * LIMITE_PERCENTUAL) / 100;
    const somaCents = aditivos.reduce((acc, a) => acc + a.valor_cents, 0);
    const excedido = somaCents > limiteCents;

    return (
        <div className="bg-white border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 font-mono">Aditivos & Apostilamentos</h3>

            <div className={`p-4 rounded-lg mb-4 ${excedido ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                <p className="text-sm font-mono">
                    Acumulado: R$ {(somaCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /
                    Limite ({LIMITE_PERCENTUAL}%): R$ {(limiteCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {excedido && <p className="font-bold mt-1">RN-009: Limite legal excedido — Aditivo bloqueado.</p>}
            </div>

            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-muted-foreground uppercase text-[10px] font-bold">
                        <th className="py-2 font-mono">Nº</th>
                        <th className="py-2 font-mono">Tipo</th>
                        <th className="py-2 font-mono text-right">Valor</th>
                        <th className="py-2 font-mono text-right">% Acum.</th>
                    </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                    {aditivos.map(a => (
                        <tr key={a.id} className="border-b border-border">
                            <td className="py-2">{a.numero}</td>
                            <td className="py-2">{a.tipo}</td>
                            <td className="py-2 text-right">R$ {(a.valor_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="py-2 text-right">{a.percentual_acumulado}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
