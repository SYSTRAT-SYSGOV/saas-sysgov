<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Backfill: até aqui ETP/Mapa de Riscos/Pesquisa de Preços tinham aprovação
 * individual (rascunho/em_revisao/aprovado/rejeitado) e `Processo.fase_atual`
 * avançava fase a fase (etp/mapa_riscos/pesquisa_precos/tr/edital). O novo
 * modelo colapsa tudo isso: depois do DFD aprovado o processo fica em
 * `em_elaboracao` (equipe de planejamento edita livremente) até a aprovação
 * final do Ordenador; os documentos só têm `rascunho`/`aprovado`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('licita_processos')
            ->whereIn('fase_atual', ['etp', 'mapa_riscos', 'pesquisa_precos', 'tr', 'edital'])
            ->update(['fase_atual' => 'em_elaboracao']);

        foreach (['licita_etps', 'licita_mapas_riscos', 'licita_pesquisas_precos'] as $tabela) {
            DB::table($tabela)
                ->whereIn('status', ['em_revisao', 'rejeitado'])
                ->update(['status' => 'rascunho']);
        }
    }

    public function down(): void
    {
        // Backfill sem volta — o estado fase-a-fase anterior não é
        // recuperável a partir do estado colapsado.
    }
};
