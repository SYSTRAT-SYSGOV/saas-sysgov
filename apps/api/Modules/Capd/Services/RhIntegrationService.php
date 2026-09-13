<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Models\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\FatorAvaliacao;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Models\RhSyncLog;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorAfastamento;

final class RhIntegrationService
{
    /**
     * Sincronização Inbound de Servidores a partir de payload JSON do ERP de RH.
     *
     * @param array<int, array<string, mixed>> $servidoresList
     * @return array{sucesso: bool, processados: int, inseridos: int, atualizados: int, erros: list<string>}
     */
    public function syncServidores(RhIntegracao $integracao, array $servidoresList, ?string $ip = null): array
    {
        $tenantId = $integracao->tenant_id;
        $mappings = $integracao->field_mappings ?? [];

        $processados = 0;
        $inseridos = 0;
        $atualizados = 0;
        $erros = [];

        DB::beginTransaction();
        try {
            foreach ($servidoresList as $item) {
                $processados++;

                // Resolução de campos com de-para
                $matricula = trim((string) ($item[$mappings['matricula'] ?? 'matricula'] ?? ''));
                $nome = trim((string) ($item[$mappings['nome'] ?? 'nome_completo'] ?? $item['nome'] ?? ''));
                $cpfRaw = preg_replace('/\D/', '', (string) ($item[$mappings['cpf'] ?? 'cpf'] ?? ''));
                $cargo = trim((string) ($item[$mappings['cargo'] ?? 'cargo_efetivo'] ?? $item['cargo'] ?? 'Servidor'));
                $lotacao = trim((string) ($item[$mappings['lotacao'] ?? 'orgao_lotacao'] ?? $item['lotacao'] ?? 'Administração'));
                $regime = trim((string) ($item[$mappings['regime'] ?? 'regime_juridico'] ?? 'estatutario'));
                $situacao = trim((string) ($item[$mappings['situacao'] ?? 'situacao_funcional'] ?? 'ativo'));

                if (empty($matricula) || empty($nome)) {
                    $erros[] = "Registro {$processados}: Matrícula ou Nome vazios.";
                    continue;
                }

                $cpf = strlen($cpfRaw) === 11
                    ? substr($cpfRaw, 0, 3) . '.' . substr($cpfRaw, 3, 3) . '.' . substr($cpfRaw, 6, 3) . '-' . substr($cpfRaw, 9, 2)
                    : '000.000.000-00';

                $payload = [
                    'tenant_id'             => $tenantId,
                    'matricula'             => $matricula,
                    'nome_completo'         => $nome,
                    'cpf'                   => $cpf,
                    'cargo_efetivo'         => $cargo,
                    'orgao_lotacao'         => $lotacao,
                    'regime_juridico'       => $regime,
                    'situacao_funcional'    => $situacao,
                    'origem_sistema'        => $integracao->driver,
                    'metadata'              => $item,
                ];

                $servidor = Servidor::where('tenant_id', $tenantId)->where('matricula', $matricula)->first();

                if ($servidor) {
                    $servidor->update($payload);
                    $atualizados++;
                } else {
                    Servidor::create($payload);
                    $inseridos++;
                }
            }

            $integracao->update(['ultima_sincronizacao_em' => now()]);
            DB::commit();

            // Grava Log de Auditoria
            RhSyncLog::create([
                'tenant_id'             => $tenantId,
                'integracao_id'         => $integracao->id,
                'tipo'                  => 'servidores',
                'direcao'               => 'inbound',
                'status'                => empty($erros) ? 'sucesso' : 'parcial',
                'registros_processados' => $processados,
                'registros_sucesso'     => $inseridos + $atualizados,
                'registros_falha'       => count($erros),
                'detalhes'              => ['erros' => $erros],
                'ip_origem'             => $ip,
            ]);

            return [
                'sucesso'     => true,
                'processados' => $processados,
                'inseridos'   => $inseridos,
                'atualizados' => $atualizados,
                'erros'       => $erros,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Erro ao sincronizar servidores via API de RH:', ['erro' => $e->getMessage()]);

            RhSyncLog::create([
                'tenant_id'             => $tenantId,
                'integracao_id'         => $integracao->id,
                'tipo'                  => 'servidores',
                'direcao'               => 'inbound',
                'status'                => 'erro',
                'registros_processados' => $processados,
                'registros_sucesso'     => 0,
                'registros_falha'       => $processados,
                'detalhes'              => ['exception' => $e->getMessage()],
                'ip_origem'             => $ip,
            ]);

            throw $e;
        }
    }

    /**
     * Sincronização de Assiduidade e Frequência do RH (alimentação de F1).
     *
     * @param array<int, array{matricula: string, faltas_injustificadas: int, atrasos_minutos: int, data_apuracao: string}> $frequenciaList
     * @return array{sucesso: bool, processados: int, atualizados: int, erros: list<string>}
     */
    public function syncFrequencia(RhIntegracao $integracao, array $frequenciaList, ?string $ip = null): array
    {
        $tenantId = $integracao->tenant_id;
        $cicloAtivo = CicloAvaliacao::where('tenant_id', $tenantId)
            ->whereIn('status', ['planejamento', 'em_avaliacao'])
            ->latest('ano_referencia')
            ->first();

        $fatorF1 = FatorAvaliacao::where('tenant_id', $tenantId)->where('codigo', 'F1')->first();

        $processados = 0;
        $atualizados = 0;
        $erros = [];

        foreach ($frequenciaList as $item) {
            $processados++;
            $matricula = (string) ($item['matricula'] ?? '');
            $faltas = (int) ($item['faltas_injustificadas'] ?? 0);

            $servidor = Servidor::where('tenant_id', $tenantId)->where('matricula', $matricula)->first();
            if (!$servidor) {
                $erros[] = "Servidor com matrícula '{$matricula}' não encontrado.";
                continue;
            }

            // Se o servidor tiver faltas injustificadas no ciclo, registra incidente crítico (CIT negativo) em F1
            if ($faltas > 0 && $cicloAtivo && $fatorF1) {
                DiarioBordo::updateOrCreate(
                    [
                        'tenant_id'       => $tenantId,
                        'ciclo_id'        => $cicloAtivo->id,
                        'servidor_id'     => $servidor->user_id ?? 1,
                        'fator_id'        => $fatorF1->id,
                        'data_ocorrencia' => $item['data_apuracao'] ?? date('Y-m-d'),
                    ],
                    [
                        'avaliador_id'    => $servidor->chefia_imediata_id ?? 1,
                        'tipo'            => 'negativo',
                        'descricao_fato'  => "Importação de Frequência RH: {$faltas} falta(s) injustificada(s) computada(s).",
                    ]
                );
            }

            $atualizados++;
        }

        RhSyncLog::create([
            'tenant_id'             => $tenantId,
            'integracao_id'         => $integracao->id,
            'tipo'                  => 'frequencia',
            'direcao'               => 'inbound',
            'status'                => empty($erros) ? 'sucesso' : 'parcial',
            'registros_processados' => $processados,
            'registros_sucesso'     => $atualizados,
            'registros_falha'       => count($erros),
            'detalhes'              => ['erros' => $erros],
            'ip_origem'             => $ip,
        ]);

        return [
            'sucesso'     => true,
            'processados' => $processados,
            'atualizados' => $atualizados,
            'erros'       => $erros,
        ];
    }

    /**
     * Sincronização de Afastamentos / Licenças vindos do RH.
     *
     * @param array<int, array<string, mixed>> $afastamentosList
     * @return array{sucesso: bool, processados: int, inseridos: int, erros: list<string>}
     */
    public function syncAfastamentos(RhIntegracao $integracao, array $afastamentosList, ?string $ip = null): array
    {
        $tenantId = $integracao->tenant_id;
        $processados = 0;
        $inseridos = 0;
        $erros = [];

        foreach ($afastamentosList as $item) {
            $processados++;
            $matricula = (string) ($item['matricula'] ?? '');
            $servidor = Servidor::where('tenant_id', $tenantId)->where('matricula', $matricula)->first();

            if (!$servidor) {
                $erros[] = "Servidor '{$matricula}' não localizado.";
                continue;
            }

            ServidorAfastamento::create([
                'tenant_id'          => $tenantId,
                'servidor_id'        => $servidor->id,
                'tipo_afastamento'   => $item['tipo_afastamento'] ?? 'outro',
                'data_inicio'        => $item['data_inicio'] ?? date('Y-m-d'),
                'data_fim'           => $item['data_fim'] ?? null,
                'dias_afastado'      => isset($item['dias_afastado']) ? (int) $item['dias_afastado'] : null,
                'suspende_avaliacao' => (bool) ($item['suspende_avaliacao'] ?? true),
                'observacoes'        => $item['observacoes'] ?? 'Sincronizado via API RH',
            ]);

            $inseridos++;
        }

        RhSyncLog::create([
            'tenant_id'             => $tenantId,
            'integracao_id'         => $integracao->id,
            'tipo'                  => 'afastamentos',
            'direcao'               => 'inbound',
            'status'                => empty($erros) ? 'sucesso' : 'parcial',
            'registros_processados' => $processados,
            'registros_sucesso'     => $inseridos,
            'registros_falha'       => count($erros),
            'detalhes'              => ['erros' => $erros],
            'ip_origem'             => $ip,
        ]);

        return [
            'sucesso'     => true,
            'processados' => $processados,
            'inseridos'   => $inseridos,
            'erros'       => $erros,
        ];
    }

    /**
     * Exportação Outbound das avaliações homologadas para a Folha e Carreira do ERP de RH.
     *
     * @return array<string, mixed>
     */
    public function exportAvaliacoes(int $tenantId, int $cicloId): array
    {
        $ciclo = CicloAvaliacao::where('tenant_id', $tenantId)->findOrFail($cicloId);

        $avaliacoes = Avaliacao::query()
            ->where('tenant_id', $tenantId)
            ->where('ciclo_id', $cicloId)
            ->where('homologada', true)
            ->with(['servidor', 'avaliador'])
            ->get();

        $dadosExportacao = [];
        foreach ($avaliacoes as $av) {
            $nota = (float) $av->nota_final;
            $conceito = match (true) {
                $nota >= 90.0 => 'EXCELENTE',
                $nota >= 75.0 => 'BOM',
                $nota >= 60.0 => 'REGULAR',
                default       => 'INSUFICIENTE',
            };

            $dadosExportacao[] = [
                'avaliacao_id'        => $av->id,
                'servidor_id'         => $av->servidor_id,
                'servidor_nome'       => $av->servidor?->name ?? 'Servidor',
                'servidor_matricula'  => $av->servidor?->matricula ?? null,
                'nota_final'          => $av->nota_final,
                'conceito'            => $conceito,
                'elegivel_progressao' => (bool) $av->elegivel_progressao,
                'data_homologacao'    => $av->homologada_em?->toIso8601String(),
                'status'              => 'homologado',
            ];
        }

        RhSyncLog::create([
            'tenant_id'             => $tenantId,
            'tipo'                  => 'homologacao',
            'direcao'               => 'outbound',
            'status'                => 'sucesso',
            'registros_processados' => count($dadosExportacao),
            'registros_sucesso'     => count($dadosExportacao),
            'detalhes'              => ['ciclo_id' => $cicloId, 'ano' => $ciclo->ano_referencia],
        ]);

        return [
            'tenant_id'       => $tenantId,
            'ciclo'           => [
                'id'             => $ciclo->id,
                'nome'           => $ciclo->nome,
                'ano_referencia' => $ciclo->ano_referencia,
            ],
            'total_avaliacoes' => count($dadosExportacao),
            'gerado_em'       => now()->toIso8601String(),
            'avaliacoes'      => $dadosExportacao,
        ];
    }

    /**
     * Notifica o ERP de RH via Webhook sobre homologação.
     */
    public function dispatchWebhookHomologacao(Avaliacao $avaliacao): void
    {
        $tenantId = $avaliacao->tenant_id;
        $integracoes = RhIntegracao::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->whereNotNull('webhook_url')
            ->get();

        if ($integracoes->isEmpty()) {
            return;
        }

        $payload = [
            'evento'            => 'avaliacao.homologada',
            'tenant_id'         => $tenantId,
            'avaliacao_id'      => $avaliacao->id,
            'ciclo_id'          => $avaliacao->ciclo_id,
            'servidor_id'       => $avaliacao->servidor_id,
            'nota_final'        => $avaliacao->nota_final,
            'elegivel_progressao' => $avaliacao->elegivel_progressao,
            'homologada_em'     => $avaliacao->homologada_em?->toIso8601String(),
        ];

        foreach ($integracoes as $int) {
            $secret = $int->webhook_secret ?? 'secret';
            $signature = hash_hmac('sha256', json_encode($payload), $secret);

            try {
                Http::timeout(5)
                    ->withHeaders([
                        'X-SYSGOV-Signature' => $signature,
                        'Content-Type'       => 'application/json',
                    ])
                    ->post($int->webhook_url, $payload);
            } catch (\Throwable $e) {
                Log::warning("Falha ao entregar webhook para {$int->webhook_url}: " . $e->getMessage());
            }
        }
    }
}
