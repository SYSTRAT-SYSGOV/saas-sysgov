<?php

declare(strict_types=1);

namespace Modules\Vistoria\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Assinatura;
use Modules\Vistoria\Models\Documento;

final class AssinaturaService
{
    public function __construct(
        private AuditLogger $audit,
        private DocumentoService $documentos,
    ) {}

    /**
     * Sincroniza uma assinatura coletada em tela (vetor + PNG rasterizado), vinculada ao
     * documento por hash sha256. Idempotente por `client_uuid`. O timestamp oficial
     * (`assinado_em`) é sempre o do servidor, nunca o do dispositivo — o timestamp do
     * dispositivo (`coletado_em_dispositivo`) é mantido só como metadado complementar.
     *
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando a imagem rasterizada não é informada
     *
     * @return array{assinatura: Assinatura, duplicado: bool}
     */
    public function sincronizarAssinatura(Documento $documento, string $clientUuid, array $dados): array
    {
        $existente = Assinatura::where('client_uuid', $clientUuid)->first();
        if ($existente) {
            return ['assinatura' => $existente, 'duplicado' => true];
        }

        $imagemBase64 = $dados['imagem_base64'] ?? null;
        if (! is_string($imagemBase64) || $imagemBase64 === '') {
            throw new \DomainException('A imagem rasterizada da assinatura é obrigatória.');
        }

        $bytes = (string) base64_decode(preg_replace('#^data:image/\w+;base64,#', '', $imagemBase64) ?? '', true);
        $hash = hash('sha256', $bytes);
        $caminho = "vistoria/assinaturas/{$documento->tenant_id}/{$clientUuid}.png";

        $assinatura = DB::transaction(function () use ($documento, $clientUuid, $dados, $bytes, $hash, $caminho): Assinatura {
            Storage::disk('public')->put($caminho, $bytes);

            $assinatura = Assinatura::create([
                'documento_id' => $documento->id,
                'client_uuid' => $clientUuid,
                'papel' => $dados['papel'] ?? Assinatura::PAPEL_AUTUADO,
                'status' => Assinatura::STATUS_ASSINADA,
                'tracado_vetorial' => $dados['tracado_vetorial'] ?? null,
                'imagem_path' => $caminho,
                'hash_sha256' => $hash,
                'latitude' => $dados['latitude'] ?? null,
                'longitude' => $dados['longitude'] ?? null,
                'coletado_em_dispositivo' => $dados['coletado_em_dispositivo'] ?? null,
                'assinado_em' => now(),
            ]);

            $documento->update(['assinatura_status' => Documento::ASSINATURA_ASSINADA]);

            return $assinatura;
        });

        $this->documentos->regenerarPdf($documento);
        $this->audit->record('vistoria', 'assinatura.coletada', "Assinatura #{$assinatura->id} (Documento #{$documento->id})", null, $assinatura->toArray());

        return ['assinatura' => $assinatura, 'duplicado' => false];
    }

    /**
     * Registra a recusa de assinatura pelo autuado, com motivo e testemunha opcional
     * (resolvida no Cadastro Único). Idempotente por `client_uuid`.
     *
     * @param array<string, mixed> $dados
     *
     * @throws \DomainException quando falta o motivo ou a testemunha informada não existe
     *
     * @return array{assinatura: Assinatura, duplicado: bool}
     */
    public function registrarRecusa(Documento $documento, string $clientUuid, array $dados): array
    {
        $existente = Assinatura::where('client_uuid', $clientUuid)->first();
        if ($existente) {
            return ['assinatura' => $existente, 'duplicado' => true];
        }

        $motivo = $dados['motivo'] ?? null;
        if (! is_string($motivo) || trim($motivo) === '') {
            throw new \DomainException('O motivo da recusa de assinatura é obrigatório.');
        }

        $testemunha = null;
        if (! empty($dados['testemunha_pessoa_id'])) {
            $testemunha = Pessoa::find($dados['testemunha_pessoa_id']);
            if (! $testemunha) {
                throw new \DomainException('Testemunha não encontrada no Cadastro Único.');
            }
        }

        $assinatura = DB::transaction(function () use ($documento, $clientUuid, $dados, $motivo, $testemunha): Assinatura {
            $assinatura = Assinatura::create([
                'documento_id' => $documento->id,
                'client_uuid' => $clientUuid,
                'papel' => $dados['papel'] ?? Assinatura::PAPEL_AUTUADO,
                'status' => Assinatura::STATUS_RECUSADA,
                'motivo_recusa' => $motivo,
                'testemunha_pessoa_id' => $testemunha?->id,
                'latitude' => $dados['latitude'] ?? null,
                'longitude' => $dados['longitude'] ?? null,
                'coletado_em_dispositivo' => $dados['coletado_em_dispositivo'] ?? null,
                'assinado_em' => now(),
            ]);

            $documento->update(['assinatura_status' => Documento::ASSINATURA_RECUSADA]);

            return $assinatura;
        });

        $this->documentos->regenerarPdf($documento);
        $this->audit->record('vistoria', 'assinatura.recusada', "Assinatura #{$assinatura->id} (Documento #{$documento->id})", null, $assinatura->toArray());

        return ['assinatura' => $assinatura, 'duplicado' => false];
    }
}
