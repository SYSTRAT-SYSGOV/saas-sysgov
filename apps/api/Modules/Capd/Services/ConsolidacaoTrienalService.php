<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ConsolidacaoTrienal;
use Modules\Capd\Models\Servidor;

/**
 * Persistência da Consolidação Trienal (NFC) — RN-02, RN-04, RN-05.
 *
 * O cálculo em si (NFC, conceito, desempate) permanece em NotaCalculoService,
 * que é puro e não toca no banco. Este serviço só grava o snapshot resultante
 * de forma imutável e versionada: reprocessar o mesmo (servidor, triênio)
 * nunca atualiza um registro existente, sempre cria a próxima versão.
 */
final class ConsolidacaoTrienalService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{notas_ciclos: array<int|string, string>, nfc: string, conceito: string, elegivel: bool} $dadosNfc
     */
    public function persistir(Servidor $servidor, CicloAvaliacao $ciclo, array $dadosNfc): ConsolidacaoTrienal
    {
        $trienio = $ciclo->ano_competencia - ($ciclo->etapa_cadencia - 1);

        return DB::transaction(function () use ($servidor, $ciclo, $trienio, $dadosNfc): ConsolidacaoTrienal {
            $ultimaVersao = ConsolidacaoTrienal::query()
                ->where('tenant_id', $ciclo->tenant_id)
                ->where('servidor_id', $servidor->id)
                ->where('trienio', $trienio)
                ->max('versao');

            $consolidacao = ConsolidacaoTrienal::create([
                'tenant_id'            => $ciclo->tenant_id,
                'servidor_id'          => $servidor->id,
                'ciclo_id'             => $ciclo->id,
                'trienio'              => $trienio,
                'notas_ciclos'         => $dadosNfc['notas_ciclos'],
                'nfc'                  => $dadosNfc['nfc'],
                'conceito'             => $dadosNfc['conceito'],
                'elegivel_progressao'  => $dadosNfc['elegivel'],
                'parametros'           => [
                    'nota_corte_nfc'   => $ciclo->nota_corte_nfc ?? '70.00',
                    'faixas_conceito'  => $ciclo->getRegras()['faixas_conceito'] ?? null,
                ],
                'versao'               => ((int) $ultimaVersao) + 1,
            ]);

            $this->audit->record(
                'capd',
                'consolidacao.trienal_persistida',
                "Consolidação trienal {$trienio} v{$consolidacao->versao} para servidor #{$servidor->id}: NFC={$dadosNfc['nfc']}",
                null,
                ['consolidacao_id' => $consolidacao->id, 'trienio' => $trienio, 'versao' => $consolidacao->versao, 'nfc' => $dadosNfc['nfc']]
            );

            return $consolidacao;
        });
    }
}
