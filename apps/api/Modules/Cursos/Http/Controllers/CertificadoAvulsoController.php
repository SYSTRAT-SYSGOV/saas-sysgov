<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Cursos\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Services\EmissaoAvulsaService;

/**
 * Emissão avulsa de certificados num curso (D7): lista digitada ou CSV. Resposta
 * {emitidos, existentes, recusadas: [{linha, motivo}]}.
 */
final class CertificadoAvulsoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly EmissaoAvulsaService $avulsos) {}

    public function store(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('emitirAvulso', [Certificado::class, $curso]);
        $dados = $request->validate([
            'modelo_id' => ['nullable', 'integer', $this->modeloDoTenant()],
            'concluido_em' => ['nullable', 'date'],
            'pessoas' => ['required', 'array', 'min:1', 'max:' . EmissaoAvulsaService::MAX_LINHAS],
            'pessoas.*.nome' => ['nullable', 'string', 'max:200'],
            'pessoas.*.email' => ['nullable', 'string', 'max:200'],
            'pessoas.*.documento' => ['nullable', 'string', 'max:20'],
            'pessoas.*.concluido_em' => ['nullable', 'string', 'max:10'],
            'pessoas.*.empresa_id' => ['nullable', 'integer'],
        ]);

        return $this->executar(fn () => response()->json($this->avulsos->emitir(
            $curso,
            $dados['pessoas'],
            $this->modelo($dados['modelo_id'] ?? null),
            $dados['concluido_em'] ?? null,
        )));
    }

    public function importar(Request $request, Curso $curso): JsonResponse
    {
        $this->authorize('emitirAvulso', [Certificado::class, $curso]);
        $dados = $request->validate([
            'arquivo' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
            'modelo_id' => ['nullable', 'integer', $this->modeloDoTenant()],
            'concluido_em' => ['nullable', 'date'],
        ]);

        return $this->executar(fn () => response()->json($this->avulsos->importar(
            $curso,
            $request->file('arquivo'),
            $this->modelo($dados['modelo_id'] ?? null),
            $dados['concluido_em'] ?? null,
        )));
    }

    private function modeloDoTenant(): \Illuminate\Validation\Rules\Exists
    {
        return Rule::exists('cursos_modelos_certificado', 'id')->where('tenant_id', app(TenantContext::class)->id());
    }

    private function modelo(?int $id): ?ModeloCertificado
    {
        return $id !== null ? ModeloCertificado::query()->findOrFail($id) : null;
    }
}
