<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\EncerramentoService;

final class CertificadoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(
        private readonly CertificadoService $certificados,
        private readonly EncerramentoService $encerramento,
    ) {}

    public function encerrarTurma(Request $request, Turma $turma): JsonResponse
    {
        $this->authorize('operar', $turma);

        return $this->executar(fn () => response()->json($this->encerramento->encerrar($turma, $request->user())));
    }

    public function emitirPendentes(Turma $turma): JsonResponse
    {
        $this->authorize('update', $turma);

        return $this->executar(fn () => response()->json($this->encerramento->emitirPendentes($turma)));
    }

    /** Gestão: certificados do órgão. */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Certificado::class);

        $query = Certificado::query()->with('participante:id,nome,email')->latest('id');
        if ($busca = $request->query('busca')) {
            $codigo = CertificadoService::normalizarCodigo((string) $busca);
            $query->where(fn ($q) => $q->where('codigo', $codigo)->orWhereHas('participante', fn ($p) => $p->where('nome', 'like', '%' . $busca . '%')));
        }

        return response()->json($query->paginate((int) $request->query('per_page', 25))->through(fn (Certificado $c): array => $this->resumo($c)));
    }

    /** Área do participante. */
    public function meus(Request $request): JsonResponse
    {
        $participante = Participante::query()->where('user_id', $request->user()->id)->first();
        if ($participante === null) {
            return response()->json([]);
        }

        return response()->json(
            Certificado::query()->where('participante_id', $participante->id)->latest('emitido_em')->get()->map(fn (Certificado $c): array => $this->resumo($c)),
        );
    }

    public function pdf(Certificado $certificado): Response|JsonResponse
    {
        $this->authorize('view', $certificado);

        return $this->baixar($certificado);
    }

    public function revogar(Request $request, Certificado $certificado): JsonResponse
    {
        $this->authorize('revogar', $certificado);
        $dados = $request->validate(['motivo' => ['required', 'string', 'max:500']]);

        return $this->executar(fn () => response()->json($this->resumo($this->certificados->revogar($certificado, $request->user(), $dados['motivo']))));
    }

    private function baixar(Certificado $certificado): Response|JsonResponse
    {
        try {
            $conteudo = $this->certificados->pdf($certificado);
        } catch (\DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response($conteudo, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="certificado-' . $certificado->codigoFormatado() . '.pdf"',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resumo(Certificado $c): array
    {
        return [
            'id' => $c->id,
            'codigo' => $c->codigoFormatado(),
            'tipo' => $c->tipo,
            'participante_id' => $c->participante_id,
            'participante' => $c->dados['participante'] ?? null,
            'curso' => $c->dados['curso'] ?? null,
            'carga_horaria' => $c->dados['carga_horaria'] ?? null,
            'periodo' => $c->dados['periodo'] ?? null,
            'emitido_em' => $c->emitido_em->toIso8601String(),
            'revogado_em' => $c->revogado_em?->toIso8601String(),
            'motivo_revogacao' => $c->motivo_revogacao,
            'url_validacao' => CertificadoService::urlValidacao($c->codigo),
        ];
    }
}
