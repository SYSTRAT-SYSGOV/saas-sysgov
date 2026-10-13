<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Ata\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaParticipante;
use Modules\Ata\Services\ArquivoAtaService;
use Modules\Ata\Services\AssinaturaService;
use Symfony\Component\HttpFoundation\Response;

final class AssinaturaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AssinaturaService $assinaturas,
        private readonly ArquivoAtaService $arquivos,
    ) {}

    /** Só quem ainda não assinou: é a lista da caixa de seleção (padrão de ata). */
    public function pendentes(Ata $ata): JsonResponse
    {
        $this->authorize('sign', $ata);

        return response()->json(['data' => $this->assinaturas->pendentes($ata)->map(fn (AtaParticipante $p): array => [
            'id' => $p->id, 'nome' => $p->nome, 'cargo' => $p->cargo,
        ])->values()]);
    }

    public function store(Request $request, Ata $ata): Response
    {
        $this->authorize('sign', $ata);
        $dados = $request->validate([
            'participante_id' => ['required', 'integer'],
            'imagem' => ['required', 'string', 'max:800000'],
        ]);

        return $this->executar(function () use ($ata, $dados, $request) {
            $p = $this->assinaturas->assinar($ata, (int) $dados['participante_id'], $dados['imagem'], $request->user());

            return response()->json(['id' => $p->id, 'nome' => $p->nome, 'assinado_em' => $p->assinado_em?->toIso8601String()], 201);
        });
    }

    public function imagem(Ata $ata, AtaParticipante $participante): Response
    {
        $this->authorize('view', $ata);
        abort_unless($participante->ata_id === $ata->id && $participante->assinatura_path !== null, 404);

        return $this->arquivos->resposta($participante->assinatura_path, 'image/png', 'assinatura') ?? abort(404);
    }
}
