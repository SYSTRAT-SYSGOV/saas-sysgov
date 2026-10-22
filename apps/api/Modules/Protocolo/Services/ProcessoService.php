<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use App\Support\AtributosDinamicos\ValidadorAtributo;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Protocolo\Database\Seeders\TiposTramitacaoDefaultSeeder;
use Modules\Protocolo\Models\Andamento;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Documento;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Throwable;

final class ProcessoService
{
    public function __construct(
        private readonly NumeracaoService $numeracaoService,
        private readonly TenantContext $tenantContext,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * Abre um processo administrativo de forma atômica.
     *
     * @param array<string, mixed> $dadosProcesso
     * @param list<array{chave: string, valor: mixed, tipo_atributo: string}> $atributos
     * @param list<array{tipo_documento: string, arquivo: UploadedFile, nome_arquivo?: string}> $documentos
     * @param array<string, mixed>|null $dadosAndamentoInicial
     */
    public function abrir(
        array $dadosProcesso,
        array $atributos = [],
        array $documentos = [],
        ?array $dadosAndamentoInicial = null,
        ?int $tenantId = null
    ): Processo {
        $tenantId ??= $this->tenantContext->id();
        $dataAbertura = isset($dadosProcesso['data_abertura'])
            ? \Illuminate\Support\Carbon::parse($dadosProcesso['data_abertura'])
            : now();
        $ano = (int) $dataAbertura->year;

        /** @var list<string> $caminhosGravados */
        $caminhosGravados = [];

        try {
            return DB::transaction(function () use (
                $dadosProcesso,
                $atributos,
                $documentos,
                $dadosAndamentoInicial,
                $tenantId,
                $dataAbertura,
                $ano,
                &$caminhosGravados
            ): Processo {
                // 1. Numeração atômica com lock
                $numero = $this->numeracaoService->proximoNumero($ano, $tenantId);

                // 2. Criação do Processo
                $processo = Processo::create([
                    'tenant_id' => $tenantId,
                    'numero' => $numero,
                    'ano' => $ano,
                    'assunto' => $dadosProcesso['assunto'],
                    'descricao' => $dadosProcesso['descricao'] ?? null,
                    'tipo_processo' => $dadosProcesso['tipo_processo'] ?? 'administrativo_geral',
                    'sigiloso' => (bool) ($dadosProcesso['sigiloso'] ?? false),
                    'origem' => $dadosProcesso['origem'],
                    'orgao_origem_id' => $dadosProcesso['orgao_origem_id'],
                    'orgao_atual_id' => $dadosProcesso['orgao_atual_id'] ?? $dadosProcesso['orgao_origem_id'],
                    'interessado_pessoa_id' => $dadosProcesso['interessado_pessoa_id'] ?? null,
                    'processo_pai_id' => $dadosProcesso['processo_pai_id'] ?? null,
                    'status' => 'aberto',
                    'data_abertura' => $dataAbertura,
                    'created_by' => $dadosProcesso['created_by'] ?? auth()->id(),
                ]);

                // 3. Atributos dinâmicos validados
                foreach ($atributos as $attr) {
                    $valorNormalizado = ValidadorAtributo::validar($attr['tipo_atributo'], $attr['valor']);

                    Atributo::create([
                        'tenant_id' => $tenantId,
                        'processo_id' => $processo->id,
                        'chave' => $attr['chave'],
                        'valor' => $valorNormalizado,
                        'tipo_atributo' => $attr['tipo_atributo'],
                        'criado_por' => $processo->created_by,
                    ]);
                }

                // 4. Gravação física e registro de documentos
                foreach ($documentos as $doc) {
                    $arquivo = $doc['arquivo'];
                    $ext = $arquivo->getClientOriginalExtension();
                    $uuid = (string) Str::uuid();
                    $nomeFisico = $uuid . ($ext !== '' ? ".{$ext}" : '');
                    $pasta = "tenants/{$tenantId}/protocolo/{$ano}";
                    $caminhoCompleto = "{$pasta}/{$nomeFisico}";

                    // Gravação no disco local/storage configurado
                    Storage::disk('local')->putFileAs($pasta, $arquivo, $nomeFisico);
                    $caminhosGravados[] = $caminhoCompleto;

                    $hash = hash_file('sha256', $arquivo->getRealPath()) ?: '';

                    Documento::create([
                        'tenant_id' => $tenantId,
                        'processo_id' => $processo->id,
                        'tipo_documento' => $doc['tipo_documento'],
                        'nome_arquivo' => $doc['nome_arquivo'] ?? $arquivo->getClientOriginalName(),
                        'caminho_arquivo' => $caminhoCompleto,
                        'hash_arquivo' => $hash,
                        'tamanho_bytes' => $arquivo->getSize(),
                        'mime_type' => $arquivo->getMimeType(),
                        'criado_por' => $processo->created_by,
                    ]);
                }

                // 5. Primeiro andamento (Entrada/Abertura)
                $tipoTramitacaoId = $dadosAndamentoInicial['tipo_tramitacao_id'] ?? null;
                if ($tipoTramitacaoId === null) {
                    $tipoEntrada = TipoTramitacao::where('slug', 'entrada')->first();
                    if ($tipoEntrada === null) {
                        // Garante que o tipo exista
                        (new TiposTramitacaoDefaultSeeder())->run($tenantId);
                        $tipoEntrada = TipoTramitacao::where('slug', 'entrada')->firstOrFail();
                    }
                    $tipoTramitacaoId = $tipoEntrada->id;
                }

                $andamento = Andamento::create([
                    'tenant_id' => $tenantId,
                    'processo_id' => $processo->id,
                    'orgao_origem_id' => $processo->orgao_origem_id,
                    'orgao_destino_id' => $processo->orgao_atual_id,
                    'tipo_tramitacao_id' => $tipoTramitacaoId,
                    'usuario_id' => $processo->created_by ?? 1,
                    'usuario_recebedor_id' => $processo->created_by,
                    'descricao' => $dadosAndamentoInicial['descricao'] ?? 'Abertura do processo administrativo',
                    'data_recebimento' => $dataAbertura,
                    'data_envio' => null,
                    'and_atual' => true,
                    'sequencia' => 1,
                ]);

                // Atualiza o ponteiro do último andamento no processo
                $processo->update(['ultimo_andamento_id' => $andamento->id]);

                // 6. Auditoria obrigatória dentro da transação
                $this->auditLogger->record(
                    module: 'protocolo',
                    action: 'processo.abrir',
                    resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
                    before: null,
                    after: [
                        'id' => $processo->id,
                        'numero' => $processo->numero,
                        'ano' => $processo->ano,
                        'assunto' => $processo->assunto,
                        'origem' => $processo->origem,
                        'orgao_origem_id' => $processo->orgao_origem_id,
                        'orgao_atual_id' => $processo->orgao_atual_id,
                    ]
                );

                return $processo;
            });
        } catch (Throwable $e) {
            // Compensação: remove arquivos gravados no disco em caso de falha da transação
            foreach ($caminhosGravados as $caminho) {
                Storage::disk('local')->delete($caminho);
            }

            throw $e;
        }
    }

    /**
     * Conclui formalmente um processo administrativo.
     */
    public function concluir(Processo $processo, int $usuarioId, ?string $despacho = null): Processo
    {
        if (in_array($processo->status, ['concluido', 'arquivado'], true)) {
            throw new \LogicException("O processo #{$processo->numero_formatado} já se encontra {$processo->status}.");
        }

        return DB::transaction(function () use ($processo, $usuarioId, $despacho): Processo {
            $andamentoAnterior = $processo->andamentoAtual;
            $sequencia = ($andamentoAnterior?->sequencia ?? 0) + 1;

            if ($andamentoAnterior !== null) {
                $andamentoAnterior->update([
                    'and_atual' => false,
                    'data_envio' => now(),
                ]);
            }

            $tipoConclusao = TipoTramitacao::withoutGlobalScopes()
                ->where('tenant_id', $processo->tenant_id)
                ->where('slug', 'conclusao')
                ->first();

            if ($tipoConclusao === null) {
                (new TiposTramitacaoDefaultSeeder())->run($processo->tenant_id);
                $tipoConclusao = TipoTramitacao::withoutGlobalScopes()
                    ->where('tenant_id', $processo->tenant_id)
                    ->where('slug', 'conclusao')
                    ->firstOrFail();
            }

            $novoAndamento = Andamento::create([
                'tenant_id' => $processo->tenant_id,
                'processo_id' => $processo->id,
                'orgao_origem_id' => $processo->orgao_atual_id,
                'orgao_destino_id' => $processo->orgao_atual_id,
                'tipo_tramitacao_id' => $tipoConclusao->id,
                'usuario_id' => $usuarioId,
                'usuario_recebedor_id' => $usuarioId,
                'descricao' => $despacho ?? 'Processo concluído e encerrado.',
                'data_recebimento' => now(),
                'data_envio' => null,
                'and_atual' => true,
                'sequencia' => $sequencia,
            ]);

            $processo->update([
                'status' => 'concluido',
                'data_conclusao' => now(),
                'ultimo_andamento_id' => $novoAndamento->id,
            ]);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.concluir',
                resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
                before: ['status' => $processo->getOriginal('status')],
                after: ['status' => 'concluido', 'data_conclusao' => now()->toIso8601String()]
            );

            return $processo->fresh(['orgaoAtual', 'andamentoAtual']);
        });
    }

    /**
     * Arquiva um processo em uma das 3 fases arquivísticas: corrente, intermediário ou permanente.
     */
    public function arquivar(
        Processo $processo,
        int $usuarioId,
        string $tipoArquivamento = 'corrente',
        ?string $despacho = null
    ): Processo {
        if (!in_array($tipoArquivamento, ['corrente', 'intermediario', 'permanente'], true)) {
            throw new \InvalidArgumentException("Tipo de arquivamento inválido: '{$tipoArquivamento}'. Permitidos: corrente, intermediario, permanente.");
        }

        if ($processo->status === 'arquivado') {
            throw new \LogicException("O processo #{$processo->numero_formatado} já se encontra arquivado.");
        }

        return DB::transaction(function () use ($processo, $usuarioId, $tipoArquivamento, $despacho): Processo {
            $andamentoAnterior = $processo->andamentoAtual;
            $sequencia = ($andamentoAnterior?->sequencia ?? 0) + 1;

            if ($andamentoAnterior !== null) {
                $andamentoAnterior->update([
                    'and_atual' => false,
                    'data_envio' => now(),
                ]);
            }

            $tipoArquivamentoTramitacao = TipoTramitacao::withoutGlobalScopes()
                ->where('tenant_id', $processo->tenant_id)
                ->where('slug', 'arquivamento')
                ->first();

            if ($tipoArquivamentoTramitacao === null) {
                (new TiposTramitacaoDefaultSeeder())->run($processo->tenant_id);
                $tipoArquivamentoTramitacao = TipoTramitacao::withoutGlobalScopes()
                    ->where('tenant_id', $processo->tenant_id)
                    ->where('slug', 'arquivamento')
                    ->firstOrFail();
            }

            $novoAndamento = Andamento::create([
                'tenant_id' => $processo->tenant_id,
                'processo_id' => $processo->id,
                'orgao_origem_id' => $processo->orgao_atual_id,
                'orgao_destino_id' => $processo->orgao_atual_id,
                'tipo_tramitacao_id' => $tipoArquivamentoTramitacao->id,
                'usuario_id' => $usuarioId,
                'usuario_recebedor_id' => $usuarioId,
                'descricao' => $despacho ?? "Processo arquivado em fase {$tipoArquivamento}.",
                'data_recebimento' => now(),
                'data_envio' => null,
                'and_atual' => true,
                'sequencia' => $sequencia,
            ]);

            $processo->update([
                'status' => 'arquivado',
                'arquivamento_tipo' => $tipoArquivamento,
                'data_arquivamento' => now(),
                'ultimo_andamento_id' => $novoAndamento->id,
            ]);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.arquivar',
                resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
                before: ['status' => $processo->getOriginal('status')],
                after: ['status' => 'arquivado', 'arquivamento_tipo' => $tipoArquivamento]
            );

            return $processo->fresh(['orgaoAtual', 'andamentoAtual']);
        });
    }

    /**
     * Desarquiva um processo, retornando-o para a tramitação ativa.
     */
    public function desarquivar(Processo $processo, int $usuarioId, ?string $motivo = null): Processo
    {
        if ($processo->status !== 'arquivado') {
            throw new \LogicException("Apenas processos arquivados podem ser desarquivados.");
        }

        return DB::transaction(function () use ($processo, $usuarioId, $motivo): Processo {
            $andamentoAnterior = $processo->andamentoAtual;
            $sequencia = ($andamentoAnterior?->sequencia ?? 0) + 1;

            if ($andamentoAnterior !== null) {
                $andamentoAnterior->update([
                    'and_atual' => false,
                    'data_envio' => now(),
                ]);
            }

            $tipoDesarquivamento = TipoTramitacao::withoutGlobalScopes()
                ->where('tenant_id', $processo->tenant_id)
                ->where('slug', 'desarquivamento')
                ->first();

            if ($tipoDesarquivamento === null) {
                (new TiposTramitacaoDefaultSeeder())->run($processo->tenant_id);
                $tipoDesarquivamento = TipoTramitacao::withoutGlobalScopes()
                    ->where('tenant_id', $processo->tenant_id)
                    ->where('slug', 'desarquivamento')
                    ->firstOrFail();
            }

            $novoAndamento = Andamento::create([
                'tenant_id' => $processo->tenant_id,
                'processo_id' => $processo->id,
                'orgao_origem_id' => $processo->orgao_atual_id,
                'orgao_destino_id' => $processo->orgao_atual_id,
                'tipo_tramitacao_id' => $tipoDesarquivamento->id,
                'usuario_id' => $usuarioId,
                'usuario_recebedor_id' => $usuarioId,
                'descricao' => $motivo ?? 'Desarquivamento de processo e retorno à tramitação.',
                'data_recebimento' => now(),
                'data_envio' => null,
                'and_atual' => true,
                'sequencia' => $sequencia,
            ]);

            $processo->update([
                'status' => 'em_tramitacao',
                'arquivamento_tipo' => null,
                'data_arquivamento' => null,
                'ultimo_andamento_id' => $novoAndamento->id,
            ]);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.desarquivar',
                resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
                before: ['status' => 'arquivado'],
                after: ['status' => 'em_tramitacao']
            );

            return $processo->fresh(['orgaoAtual', 'andamentoAtual']);
        });
    }

    /**
     * Reabre formalmente um processo concluído ou arquivado.
     */
    public function reabrir(Processo $processo, int $usuarioId, ?string $motivo = null): Processo
    {
        if (!in_array($processo->status, ['concluido', 'arquivado'], true)) {
            throw new \LogicException("Apenas processos concluídos ou arquivados podem ser reabertos.");
        }

        return DB::transaction(function () use ($processo, $usuarioId, $motivo): Processo {
            $andamentoAnterior = $processo->andamentoAtual;
            $sequencia = ($andamentoAnterior?->sequencia ?? 0) + 1;

            if ($andamentoAnterior !== null) {
                $andamentoAnterior->update([
                    'and_atual' => false,
                    'data_envio' => now(),
                ]);
            }

            $tipoReabertura = TipoTramitacao::withoutGlobalScopes()
                ->where('tenant_id', $processo->tenant_id)
                ->where('slug', 'reabertura')
                ->first();

            if ($tipoReabertura === null) {
                (new TiposTramitacaoDefaultSeeder())->run($processo->tenant_id);
                $tipoReabertura = TipoTramitacao::withoutGlobalScopes()
                    ->where('tenant_id', $processo->tenant_id)
                    ->where('slug', 'reabertura')
                    ->firstOrFail();
            }

            $novoAndamento = Andamento::create([
                'tenant_id' => $processo->tenant_id,
                'processo_id' => $processo->id,
                'orgao_origem_id' => $processo->orgao_atual_id,
                'orgao_destino_id' => $processo->orgao_atual_id,
                'tipo_tramitacao_id' => $tipoReabertura->id,
                'usuario_id' => $usuarioId,
                'usuario_recebedor_id' => $usuarioId,
                'descricao' => $motivo ?? 'Reabertura formal do processo.',
                'data_recebimento' => now(),
                'data_envio' => null,
                'and_atual' => true,
                'sequencia' => $sequencia,
            ]);

            $processo->update([
                'status' => 'em_tramitacao',
                'data_conclusao' => null,
                'arquivamento_tipo' => null,
                'data_arquivamento' => null,
                'ultimo_andamento_id' => $novoAndamento->id,
            ]);

            $this->auditLogger->record(
                module: 'protocolo',
                action: 'processo.reabrir',
                resource: "Processo #{$processo->id} ({$processo->numero_formatado})",
                before: ['status' => $processo->getOriginal('status')],
                after: ['status' => 'em_tramitacao']
            );

            return $processo->fresh(['orgaoAtual', 'andamentoAtual']);
        });
    }
}

