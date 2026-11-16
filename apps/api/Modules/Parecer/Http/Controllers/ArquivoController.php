<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Unidade;
use Modules\Escola\Services\UnidadeService;
use Modules\Escola\Support\EscolaContext;
use Modules\Parecer\Services\AcessoParecer;
use Symfony\Component\HttpFoundation\Response;

/** Foto do aluno e logo da escola (disco privado do Escola), servidas com o escopo do parecer. */
final class ArquivoController extends Controller
{
    public function __construct(private readonly AcessoParecer $acesso) {}

    public function foto(Request $request, Aluno $aluno): Response
    {
        $this->acesso->exigirTurma($request->user(), (int) $aluno->turma_id);
        abort_if($aluno->foto_path === null || !Storage::disk(UnidadeService::DISCO)->exists($aluno->foto_path), 404);

        return Storage::disk(UnidadeService::DISCO)->response($aluno->foto_path);
    }

    /** Logo da escola de trabalho; sem logo próprio, o da unidade (cadastro antigo de escola única). */
    public function logo(Request $request, EscolaContext $escola): Response
    {
        abort_unless($this->acesso->pode($request->user(), 'parecer.view'), 403);
        $caminho = $escola->get()->logo_path ?? Unidade::query()->value('logo_path');
        abort_if($caminho === null || !Storage::disk(UnidadeService::DISCO)->exists($caminho), 404);

        return Storage::disk(UnidadeService::DISCO)->response($caminho);
    }
}
