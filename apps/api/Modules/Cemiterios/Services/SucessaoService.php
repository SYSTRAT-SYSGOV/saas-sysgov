<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Models\SucessaoHerdeiro;
use Modules\Cemiterios\Models\SucessaoHistorico;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;

/**
 * Serviço principal do processo sucessório.
 */
final class SucessaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly SucessaoStateMachine $stateMachine,
        private readonly CadeiaSucessoriaService $cadeiaSucessoria,
        private readonly DocumentoSucessaoService $documentoService,
        private readonly SucessaoConfigService $configService,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * Abre um novo processo sucessório.
     *
     * @param array{
     *     concession_id: int,
     *     park_id?: int|null,
     *     plot_id?: int|null,
     *     via?: ViaSucessao|string,
     *     tipo_documento?: string|null,
     *     numero_processo?: string|null,
     *     requerente_id?: int|null,
     *     titular_falecido_id?: int|null,
     *     data_falecimento?: string|null,
     *     processo_referencia?: string|null
     * } $dados
     */
    public function abrirProcesso(array $dados): Sucessao
    {
        $concessao = Concessao::findOrFail($dados['concession_id']);
        $viaRaw = $dados['via'] ?? $dados['tipo_documento'] ?? 'inventario_judicial';
        $via = $viaRaw instanceof ViaSucessao ? $viaRaw : (ViaSucessao::tryFrom((string) $viaRaw) ?? ViaSucessao::InventarioJudicial);

        // Verifica se já existe processo em andamento para esta concessão
        $existente = Sucessao::where('concession_id', $concessao->id)
            ->whereIn('estado', [
                EstadoSucessao::Solicitada->value,
                EstadoSucessao::EmAnalise->value,
                EstadoSucessao::AguardandoDocumentos->value,
                EstadoSucessao::Validada->value,
            ])
            ->first();

        if ($existente) {
            throw new RegraNegocioException(
                'sucessao.duplicado',
                'Já existe um processo de sucessão em andamento para esta concessão.'
            );
        }

        return DB::transaction(function () use ($concessao, $dados, $via): Sucessao {
            $sucessao = Sucessao::create([
                'tenant_id' => $concessao->tenant_id,
                'concession_id' => $concessao->id,
                'park_id' => $dados['park_id'] ?? $concessao->jazigo?->park_id,
                'plot_id' => $dados['plot_id'] ?? $concessao->plot_id,
                'via' => $via,
                'estado' => EstadoSucessao::Solicitada,
                'requerente_id' => $dados['requerente_id'] ?? auth()->id(),
                'titular_falecido_id' => $dados['titular_falecido_id'] ?? $concessao->holder_id,
                'data_falecimento' => $dados['data_falecimento'] ?? null,
                'processo_referencia' => $dados['processo_referencia'] ?? null,
                'lock_version' => 1,
            ]);

            // Atualiza concessão com pendência de regularização
            $concessao->update([
                'pendencia_regularizacao' => true,
                'motivo_pendencia' => 'sucessao_hereditaria',
            ]);

            // Registra no histórico
            SucessaoHistorico::create([
                'tenant_id' => $sucessao->tenant_id,
                'sucessao_id' => $sucessao->getKey(),
                'de_estado' => '',
                'para_estado' => EstadoSucessao::Solicitada->value,
                'motivo' => ['parecer' => 'Processo de sucessão aberto', 'created_at' => now()->toIso8601String()],
                'usuario_id' => auth()->id(),
            ]);

            // Auditoria
            $this->audit->record(
                module: 'cemiterios',
                action: 'sucessao.aberta',
                resource: "Sucessao:{$sucessao->id}",
                before: null,
                after: [
                    'concession_id' => $concessao->id,
                    'via' => $via->value,
                    'estado' => EstadoSucessao::Solicitada->value,
                ]
            );

            // Publica evento na Outbox
            $this->outbox->publish('SucessaoTransicionada', [
                'sucessao_id' => $sucessao->id,
                'de_estado' => '',
                'para_estado' => EstadoSucessao::Solicitada->value,
                'usuario_id' => auth()->id(),
                'tenant_id' => $sucessao->tenant_id,
            ]);

            return $sucessao->load(['concessao', 'requerente', 'titularFalecido']);
        });
    }

    /**
     * Atualiza os dados cadastrais do processo sucessório.
     */
    public function atualizarDados(Sucessao $sucessao, array $dados): Sucessao
    {
        $estadosEditaveis = [
            EstadoSucessao::Solicitada->value,
            EstadoSucessao::EmAnalise->value,
            EstadoSucessao::AguardandoDocumentos->value,
        ];

        if (!in_array($sucessao->estado->value, $estadosEditaveis, true)) {
            throw new RegraNegocioException(
                'sucessao.nao_editavel',
                'O processo não pode ser editado no estado atual.'
            );
        }

        $sucessao->update(array_filter($dados, fn ($v) => $v !== null, ARRAY_FILTER_USE_BOTH));

        $this->audit->record(
            module: 'cemiterios',
            action: 'sucessao.atualizada',
            resource: "Sucessao:{$sucessao->id}",
            before: null,
            after: $dados
        );

        return $sucessao->fresh();
    }

    /**
     * Adiciona um herdeiro individual ao processo de sucessão.
     */
    public function adicionarHerdeiro(Sucessao $sucessao, array $dados): SucessaoHerdeiro
    {
        return SucessaoHerdeiro::create([
            'tenant_id' => $sucessao->tenant_id,
            'sucessao_id' => $sucessao->getKey(),
            'nome' => $dados['nome'],
            'parentesco' => $dados['parentesco'] instanceof Parentesco ? $dados['parentesco'] : (Parentesco::tryFrom($dados['parentesco']) ?? Parentesco::Filho),
            'documento' => $dados['documento'] ?? null,
            'ordem' => $dados['ordem'] ?? 1,
            'direito_representacao' => $dados['direito_representacao'] ?? false,
            'titular_indicado' => $dados['titular_indicado'] ?? false,
            'herdeiro_representado_id' => $dados['herdeiro_representado_id'] ?? null,
        ]);
    }

    /**
     * Adiciona ou atualiza herdeiros do processo.
     *
     * @param array<int, array{nome: string, parentesco: Parentesco|string, documento?: string|null, ordem: int, direito_representacao?: bool, titular_indicado?: bool, herdeiro_representado_id?: int|null}> $herdeiros
     */
    public function upsertHerdeiros(Sucessao $sucessao, array $herdeiros): Collection
    {
        if ($sucessao->estado->value !== EstadoSucessao::EmAnalise->value) {
            throw new RegraNegocioException(
                'sucessao.nao_editavel',
                'Herdeiros só podem ser alterados com o processo em análise.'
            );
        }

        // Validações
        $this->cadeiaSucessoria->validarOrdemPrioridade($herdeiros, $this->configService->getOrdemPrioridade());
        $this->cadeiaSucessoria->validarTitularUnico($herdeiros);
        $this->cadeiaSucessoria->validarDireitoRepresentacao($herdeiros);

        return DB::transaction(function () use ($sucessao, $herdeiros): Collection {
            // Remove herdeiros existentes
            $sucessao->herdeiros()->delete();

            // Cria novos herdeiros
            $novos = collect($herdeiros)->map(function (array $h) use ($sucessao): SucessaoHerdeiro {
                return SucessaoHerdeiro::create([
                    'tenant_id' => $sucessao->tenant_id,
                    'sucessao_id' => $sucessao->getKey(),
                    'nome' => $h['nome'],
                    'parentesco' => $h['parentesco'] instanceof Parentesco ? $h['parentesco'] : Parentesco::tryFrom($h['parentesco']),
                    'documento' => $h['documento'] ?? null,
                    'ordem' => $h['ordem'],
                    'direito_representacao' => $h['direito_representacao'] ?? false,
                    'titular_indicado' => $h['titular_indicado'] ?? false,
                    'herdeiro_representado_id' => $h['herdeiro_representado_id'] ?? null,
                ]);
            });

            $this->audit->record(
                module: 'cemiterios',
                action: 'sucessao.herdeiros.upsert',
                resource: "Sucessao:{$sucessao->id}",
                before: null,
                after: $novos->toArray()
            );

            return $novos;
        });
    }

    /**
     * Faz upload de documento para o processo.
     */
    public function uploadDocumento(Sucessao $sucessao, $arquivo, string $tipo): SucessaoDocumento
    {
        $tipoEnum = TipoDocumentoSucessao::tryFrom($tipo) ?? throw new RegraNegocioException(
            'documento.tipo_invalido',
            "Tipo de documento inválido: {$tipo}"
        );

        return $this->documentoService->upload($sucessao, $arquivo, $tipoEnum);
    }

    /**
     * Executa transição de estado do processo.
     */
    public function transicionar(Sucessao $sucessao, EstadoSucessao $para, string $motivo, ?int $lockVersion = null): Sucessao
    {
        $sucessao = $this->stateMachine->transition($sucessao, $para, $motivo, $lockVersion);

        $this->audit->record(
            module: 'cemiterios',
            action: 'sucessao.transition',
            resource: "Sucessao:{$sucessao->id}",
            before: ['estado' => $sucessao->getOriginal('estado')?->value ?? ''],
            after: ['estado' => $para->value, 'motivo' => $motivo]
        );

        // Publica evento na Outbox
        $this->outbox->publish('SucessaoTransicionada', [
            'sucessao_id' => $sucessao->id,
            'de_estado' => $sucessao->getOriginal('estado')?->value ?? '',
            'para_estado' => $para->value,
            'usuario_id' => auth()->id(),
            'tenant_id' => $sucessao->tenant_id,
        ]);

        return $sucessao;
    }

    /**
     * Conclui a sucessão (transição para Sucedida e transferência da concessão).
     */
    public function concluir(Sucessao $sucessao): Sucessao
    {
        if ($sucessao->estado->value !== EstadoSucessao::Validada->value) {
            throw new RegraNegocioException(
                'sucessao.situacao_invalida',
                'Apenas processos validados podem ser concluídos.'
            );
        }

        // Verifica se há titular indicado
        $titularIndicado = $sucessao->herdeiros()->where('titular_indicado', true)->first();
        if (!$titularIndicado) {
            throw new RegraNegocioException(
                'herdeiro.obrigatorio',
                'É necessário indicar um herdeiro como titular para concluir a sucessão.'
            );
        }

        return DB::transaction(function () use ($sucessao, $titularIndicado): Sucessao {
            $concessao = $sucessao->concessao()->lockForUpdate()->firstOrFail();
            $antigoTitularId = $concessao->holder_id;

            // Cria ou busca o novo concessionário
            $docLimpo = \Modules\Cemiterios\Support\Documento::somenteDigitos($titularIndicado->documento ?? '');
            $novoTitular = null;

            if (strlen($docLimpo) === 11 || strlen($docLimpo) === 14) {
                $novoTitular = Concessionario::firstOrCreate(
                    ['documento_hash' => \Modules\Cemiterios\Support\Documento::hash($docLimpo)],
                    [
                        'nome' => $titularIndicado->nome,
                        'tipo_doc' => strlen($docLimpo) === 14 ? 'cnpj' : 'cpf',
                        'documento' => $docLimpo,
                        'titular_falecido' => false,
                    ]
                );
            } else {
                $fakeDoc = '000' . str_pad((string) $titularIndicado->id, 8, '0', STR_PAD_LEFT);
                $novoTitular = Concessionario::create([
                    'nome' => $titularIndicado->nome,
                    'tipo_doc' => 'cpf',
                    'documento' => $fakeDoc,
                    'documento_hash' => \Modules\Cemiterios\Support\Documento::hash($fakeDoc),
                    'titular_falecido' => false,
                ]);
            }

            // Transição para Sucedida
            $sucessao = $this->stateMachine->transition(
                $sucessao,
                EstadoSucessao::Sucedida,
                'Sucessão concluída - novo titular assumiu a concessão',
                $sucessao->lock_version
            );

            // Atualiza a concessão
            $concessao->update([
                'holder_id' => $novoTitular->id,
                'estado' => 'Sucedida',
                'pendencia_regularizacao' => false,
                'motivo_pendencia' => null,
            ]);

            // Atualiza herdeiros: titular indicado vira titular, demais como herdeiros da concessão
            $titularIndicado->update(['titular_indicado' => true]);

            // Registra histórico da concessão (se existir o modelo)
            // ConcessionHistorico::create([...])

            $this->audit->record(
                module: 'cemiterios',
                action: 'sucessao.concluida',
                resource: "Sucessao:{$sucessao->id}",
                before: ['holder_id' => $antigoTitularId, 'estado' => 'Validada'],
                after: ['holder_id' => $novoTitular->id, 'estado' => 'Sucedida', 'termo' => $sucessao->fresh()->processo_referencia]
            );

            // Publica evento de conclusão
            $this->outbox->publish('SucessaoConcluida', [
                'sucessao_id' => $sucessao->id,
                'concession_id' => $concessao->id,
                'novo_titular_id' => $novoTitular->id,
                'tenant_id' => $sucessao->tenant_id,
            ]);

            return $sucessao->fresh(['concessao', 'herdeiros', 'documentos']);
        });
    }

    /**
     * Indeferir o processo sucessório.
     */
    public function indeferir(Sucessao $sucessao, string $motivo): Sucessao
    {
        if (!in_array($sucessao->estado->value, [
            EstadoSucessao::EmAnalise->value,
            EstadoSucessao::Validada->value,
        ], true)) {
            throw new RegraNegocioException(
                'sucessao.situacao_invalida',
                'Apenas processos em análise ou validados podem ser indeferidos.'
            );
        }

        $sucessao = $this->stateMachine->transition($sucessao, EstadoSucessao::Indeferida, $motivo, $sucessao->lock_version);

        // Atualiza concessão
        $sucessao->concessao->update([
            'pendencia_regularizacao' => false,
            'motivo_pendencia' => null,
        ]);

        $this->audit->record(
            module: 'cemiterios',
            action: 'sucessao.indeferida',
            resource: "Sucessao:{$sucessao->id}",
            before: ['estado' => $sucessao->getOriginal('estado')?->value ?? ''],
            after: ['estado' => EstadoSucessao::Indeferida->value, 'motivo' => $motivo]
        );

        $this->outbox->publish('SucessaoTransicionada', [
            'sucessao_id' => $sucessao->id,
            'de_estado' => $sucessao->getOriginal('estado')?->value ?? '',
            'para_estado' => EstadoSucessao::Indeferida->value,
            'usuario_id' => auth()->id(),
            'tenant_id' => $sucessao->tenant_id,
        ]);

        return $sucessao->fresh();
    }

    /**
     * Arquiva o processo sucessório.
     */
    public function arquivar(Sucessao $sucessao): Sucessao
    {
        if (!in_array($sucessao->estado->value, [
            EstadoSucessao::Indeferida->value,
            EstadoSucessao::AguardandoDocumentos->value,
        ], true)) {
            throw new RegraNegocioException(
                'sucessao.situacao_invalida',
                'Apenas processos indeferidos ou aguardando documentos podem ser arquivados.'
            );
        }

        $sucessao = $this->stateMachine->transition($sucessao, EstadoSucessao::Arquivada, 'Arquivado por prazo sem manifestação', $sucessao->lock_version);

        $this->audit->record(
            module: 'cemiterios',
            action: 'sucessao.arquivada',
            resource: "Sucessao:{$sucessao->id}",
            before: ['estado' => $sucessao->getOriginal('estado')?->value ?? ''],
            after: ['estado' => EstadoSucessao::Arquivada->value]
        );

        $this->outbox->publish('SucessaoTransicionada', [
            'sucessao_id' => $sucessao->id,
            'de_estado' => $sucessao->getOriginal('estado')?->value ?? '',
            'para_estado' => EstadoSucessao::Arquivada->value,
            'usuario_id' => auth()->id(),
            'tenant_id' => $sucessao->tenant_id,
        ]);

        return $sucessao->fresh();
    }

    /**
     * Obtém processos pendentes de análise.
     */
    public function getPendentes(int $tenantId, ?int $parkId = null): Collection
    {
        return Sucessao::where('tenant_id', $tenantId)
            ->whereIn('estado', [
                EstadoSucessao::EmAnalise->value,
                EstadoSucessao::AguardandoDocumentos->value,
                EstadoSucessao::Validada->value,
            ])
            ->when($parkId, fn ($q) => $q->where('park_id', $parkId))
            ->with(['concessao.jazigo.cemiterio', 'concessao.concessionario', 'herdeiros', 'documentos'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Obtém processos para regularização de uso.
     */
    public function getRegularizacao(int $tenantId, ?int $parkId = null): Collection
    {
        return Sucessao::where('tenant_id', $tenantId)
            ->where('estado', '!=', EstadoSucessao::Sucedida->value)
            ->when($parkId, fn ($q) => $q->where('park_id', $parkId))
            ->with(['concessao.jazigo.cemiterio', 'concessao.concessionario', 'herdeiros'])
            ->orderBy('data_falecimento')
            ->get();
    }
}