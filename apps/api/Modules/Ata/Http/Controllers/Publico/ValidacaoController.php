<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Modules\Ata\Enums\StatusAta;
use Modules\Ata\Models\Ata;

/**
 * Validação pública do PDF (sem login). Ata sigilosa: confirma a autenticidade sem título nem redator.
 * Não expõe o texto, os participantes nem o PDF.
 */
final class ValidacaoController extends Controller
{
    public function __invoke(string $codigo): JsonResponse
    {
        $codigo = strtoupper(trim($codigo));
        $ata = preg_match('/^ATA-\d{4}-[0-9A-F]{16}$/', $codigo) === 1
            ? Ata::query()->with('secretaria')->where('codigo_validacao', $codigo)->first()
            : null;

        if (!$ata instanceof Ata) {
            return response()->json(['valido' => false, 'mensagem' => 'Nenhum documento encontrado com este código.'], 404);
        }
        if ($ata->status !== StatusAta::Finalizada) {
            return response()->json(['valido' => false, 'mensagem' => 'Esta ata ainda não foi finalizada e não tem validade até a finalização.']);
        }

        return response()->json([
            'valido' => true,
            'mensagem' => 'Documento autêntico, gerado digitalmente pelo sistema oficial.',
            'codigo' => $ata->codigo_validacao,
            'numero' => $ata->numeroFormatado(),
            'secretaria' => $ata->secretaria->name,
            'finalizada_em' => $ata->finalizada_em?->toIso8601String(),
            'sigilosa' => $ata->sigilosa,
            'titulo' => $ata->sigilosa ? null : $ata->titulo,
            'redator' => $ata->sigilosa ? null : $ata->redator,
            'pdf_sha256' => $ata->pdf_sha256,
        ]);
    }
}
