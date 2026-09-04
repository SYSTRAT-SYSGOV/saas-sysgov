import React from 'react';

export const SalaLancesPage: React.FC = () => {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold font-mono text-foreground">Sala de Lances em Tempo Real</h1>
            <p className="text-sm text-muted-foreground">Disputa eletrônica via WebSocket (Laravel Reverb).</p>
        </div>
    );
};
