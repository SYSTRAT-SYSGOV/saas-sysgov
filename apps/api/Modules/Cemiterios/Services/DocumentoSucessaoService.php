<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;

/**
 * Serviço para gestão de documentos do processo sucessório.
 */
final class DocumentoSucessaoService
{
    private const DISCO = 's3';

    public function __construct(
        private readonly SucessaoConfigService $configService,
    ) {}

    /**
     * Faz upload de um documento e calcula o hash SHA-256.
     *
     * @param Sucessao $sucessao
     * @param \Illuminate\Http\UploadedFile $arquivo
     * @param TipoDocumentoSucessao $tipo
     * @return SucessaoDocumento
     */
    public function upload(Sucessao $sucessao, $arquivo, TipoDocumentoSucessao $tipo): SucessaoDocumento
    {
        $conteudo = file_get_contents($arquivo->getRealPath());
        $hash = hash('sha256', $conteudo);

        // Verifica se já existe documento com mesmo hash (deduplicação)
        $existente = SucessaoDocumento::where('tenant_id', $sucessao->tenant_id)
            ->where('sucessao_id', $sucessao->getKey())
            ->where('hash', $hash)
            ->first();

        if ($existente) {
            throw new RegraNegocioException(
                'documento.duplicado',
                'Já existe um documento idêntico anexado a este processo.'
            );
        }

        $nomeArquivo = Str::uuid() . '.' . $arquivo->getClientOriginalExtension();
        $path = "tenant/{$sucessao->tenant_id}/sucessao/{$sucessao->getKey()}/{$tipo->value}/{$nomeArquivo}";

        Storage::disk(self::DISCO)->put($path, $conteudo);

        return SucessaoDocumento::create([
            'tenant_id' => $sucessao->tenant_id,
            'sucessao_id' => $sucessao->getKey(),
            'tipo' => $tipo,
            'arquivo' => $path,
            'hash' => $hash,
        ]);
    }

    /**
     * Gera URL assinada para download do documento.
     *
     * @param SucessaoDocumento $documento
     * @param int $expiracaoMinutos
     * @return string
     */
    public function downloadUrl(SucessaoDocumento $documento, int $expiracaoMinutos = 15): string
    {
        return Storage::disk(self::DISCO)->temporaryUrl(
            $documento->arquivo,
            now()->addMinutes($expiracaoMinutos)
        );
    }

    /**
     * Verifica a integridade do documento comparando o hash.
     *
     * @param SucessaoDocumento $documento
     * @return bool
     */
    public function verificarHash(SucessaoDocumento $documento): bool
    {
        if (!Storage::disk(self::DISCO)->exists($documento->arquivo)) {
            return false;
        }

        $conteudo = Storage::disk(self::DISCO)->get($documento->arquivo);
        $hashAtual = hash('sha256', $conteudo);

        return $hashAtual === $documento->hash;
    }

    /**
     * Remove um documento (soft delete) e registra na auditoria.
     *
     * @param SucessaoDocumento $documento
     * @return void
     */
    public function remover(SucessaoDocumento $documento): void
    {
        $documento->delete();
    }

    /**
     * Purga (soft delete) documentos de processos sucessórios encerrados cuja
     * retenção LGPD configurada para o tenant já expirou.
     *
     * @return int Quantidade de documentos purgados
     */
    public function purgarExpirados(int $tenantId): int
    {
        $retencaoDias = $this->configService->getRetencaoDocumentosDias();
        $limite = now()->subDays($retencaoDias);

        $documentos = SucessaoDocumento::where('tenant_id', $tenantId)
            ->where('created_at', '<', $limite)
            ->whereHas('sucessao', function ($query): void {
                $query->whereIn('estado', [
                    EstadoSucessao::Sucedida->value,
                    EstadoSucessao::Indeferida->value,
                    EstadoSucessao::Arquivada->value,
                ]);
            })
            ->get();

        foreach ($documentos as $documento) {
            $this->remover($documento);
        }

        return $documentos->count();
    }

    /**
     * Obtém a lista de documentos obrigatórios por via de sucessão.
     *
     * @param TipoDocumentoSucessao|string $via
     * @return array<TipoDocumentoSucessao>
     */
    public function getDocumentosObrigatoriosPorVia(string $via): array
    {
        return match ($via) {
            'inventario_judicial' => [
                TipoDocumentoSucessao::CertidaoObito,
                TipoDocumentoSucessao::Inventario,
                TipoDocumentoSucessao::FormalPartilha,
                TipoDocumentoSucessao::Alvará,
            ],
            'inventario_extrajudicial' => [
                TipoDocumentoSucessao::CertidaoObito,
                TipoDocumentoSucessao::Escritura,
            ],
            'alvara_judicial' => [
                TipoDocumentoSucessao::CertidaoObito,
                TipoDocumentoSucessao::Alvará,
            ],
            'arrolamento' => [
                TipoDocumentoSucessao::CertidaoObito,
                TipoDocumentoSucessao::Outro, // termo_arrolamento
                TipoDocumentoSucessao::Alvará,
            ],
            default => [
                TipoDocumentoSucessao::CertidaoObito,
            ],
        };
    }
}