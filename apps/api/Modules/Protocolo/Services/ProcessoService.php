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
}
