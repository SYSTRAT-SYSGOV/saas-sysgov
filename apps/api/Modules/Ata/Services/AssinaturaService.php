<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Models\User;
use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Ata\Enums\StatusAta;
use Modules\Ata\Exceptions\AtaBloqueadaException;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaParticipante;

/**
 * Assinatura desenhada dos participantes (padrão de ata): cada participante assina uma única vez e, depois de
 * assinar, sai da lista de pendentes — que é a lista da caixa de seleção do front.
 */
final class AssinaturaService
{
    /** PNG do signature pad: até 512 KB. */
    public const TAMANHO_MAXIMO = 524288;

    public function __construct(
        private readonly ArquivoAtaService $arquivos,
        private readonly AuditLogger $audit,
    ) {}

    /** @return \Illuminate\Database\Eloquent\Collection<int, AtaParticipante> */
    public function pendentes(Ata $ata): \Illuminate\Database\Eloquent\Collection
    {
        return $ata->participantes()->whereNull('assinado_em')->get();
    }

    public function assinar(Ata $ata, int $participanteId, string $imagemDataUri, User $registradoPor): AtaParticipante
    {
        if (!$ata->status->aceitaAssinatura()) {
            throw new AtaBloqueadaException($ata->status === StatusAta::Finalizada
                ? 'A ata está finalizada e não aceita mais assinaturas.'
                : 'Salve o rascunho antes de colher as assinaturas: assina-se o texto já travado.');
        }
        $png = $this->decodificar($imagemDataUri);

        return DB::transaction(function () use ($ata, $participanteId, $png, $registradoPor): AtaParticipante {
            $participante = AtaParticipante::query()->where('ata_id', $ata->id)->whereKey($participanteId)->lockForUpdate()->first();
            if (!$participante instanceof AtaParticipante) {
                throw new DomainException('Participante não encontrado nesta ata.');
            }
            if ($participante->assinou()) {
                throw new AtaBloqueadaException("{$participante->nome} já assinou esta ata.");
            }
            $caminho = $this->arquivos->guardarConteudo($png, "assinaturas/{$ata->id}", 'png');
            $participante->forceFill([
                'assinatura_path' => $caminho,
                'assinado_em' => now(),
                'assinatura_registrada_por' => $registradoPor->id,
            ])->save();
            $this->audit->record('ata', 'ata.assinada', "ata:{$ata->id}", null, [
                'participante_id' => $participante->id, 'participante' => $participante->nome, 'registrado_por' => $registradoPor->id,
            ]);

            return $participante;
        });
    }

    private function decodificar(string $dataUri): string
    {
        if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $dataUri, $m)) {
            throw new DomainException('Assinatura inválida: envie a imagem PNG do quadro de assinatura.');
        }
        $png = base64_decode($m[1], true);
        if ($png === false || strlen($png) > self::TAMANHO_MAXIMO || @getimagesizefromstring($png) === false) {
            throw new DomainException('Assinatura inválida ou grande demais.');
        }

        return $png;
    }
}
