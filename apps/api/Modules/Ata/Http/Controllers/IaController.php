<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Modules\Ata\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Ata\Models\Ata;
use Modules\Ata\Services\AtaIaService;
use Modules\Ata\Services\AtaService;
use Symfony\Component\HttpFoundation\Response;

/** Assistente IA: recebe os blocos de áudio da reunião e devolve o HTML gerado (não grava na ata). */
final class IaController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly AtaIaService $ia,
        private readonly AtaService $atas,
    ) {}

    public function __invoke(Request $request, Ata $ata): Response
    {
        $this->authorize('update', $ata);
        $dados = $request->validate([
            'modo' => ['required', 'integer', 'between:1,5'],
            'audio' => ['required', 'array', 'min:1', 'max:20'],
            'audio.*' => ['file', 'max:20480', 'mimetypes:audio/webm,video/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/x-wav'],
        ]);

        return $this->executar(function () use ($ata, $dados) {
            $this->atas->exigirEditavel($ata);

            return response()->json(['texto' => $this->ia->gerar($ata, array_values($dados['audio']), (int) $dados['modo'])]);
        });
    }
}
