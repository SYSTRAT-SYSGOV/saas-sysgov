<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Modules\Inservivel\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Inservivel\Services\ArquivoService;
use Modules\Inservivel\Services\CadastroEntidadeService;
use Modules\Inservivel\Support\RegrasEntidade;

/**
 * Cadastro público da entidade (spec: Cadastro público da entidade; D7). Sem login: o tenant vem do slug pelo
 * ResolveTenantPublicoInservivel. Só depende do CadastroEntidadeService (ver o teste de arquitetura do módulo).
 */
final class CadastroPublicoController extends Controller
{
    use RespondeErroDeNegocio;

    /** Campo isca: invisível no formulário; robôs preenchem. */
    public const CAMPO_ISCA = 'website';

    public function __construct(
        private readonly CadastroEntidadeService $cadastro,
        private readonly TenantContext $tenant,
    ) {}

    public function formulario(): JsonResponse
    {
        $tenant = $this->tenant->get();
        $settings = (array) ($tenant->getAttribute('settings') ?? []);

        return response()->json([
            'orgao' => ['nome' => $tenant->getAttribute('name'), 'logo_url' => $settings['customLogoUrl'] ?? null],
            'documentos_exigidos' => $this->cadastro->documentosExigidos(),
        ]);
    }

    public function cadastrar(Request $request): JsonResponse
    {
        $resposta = ['ok' => true, 'mensagem' => 'Cadastro recebido. Entre pelo login com o e-mail e a senha informados para acompanhar a análise.'];
        if (filled($request->input(self::CAMPO_ISCA))) {
            return response()->json($resposta, 201);
        }
        $chaves = array_column($this->cadastro->documentosExigidos(), 'chave');
        $dados = $request->validate([
            ...RegrasEntidade::dados(true),
            'email' => ['required', 'email', 'max:255'],
            'senha' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'aceite_privacidade' => ['accepted'],
            'documentos' => ['sometimes', 'array', 'max:' . max(1, count($chaves))],
            'documentos.*' => ArquivoService::REGRA_DOCUMENTO_ENTIDADE,
            'validades' => ['sometimes', 'array'],
            'validades.*' => ['nullable', 'date'],
        ]);
        /** @var array<string, UploadedFile> $documentos */
        $documentos = array_filter((array) $request->file('documentos', []), fn ($f): bool => $f instanceof UploadedFile);
        /** @var array<string, string|null> $validades */
        $validades = (array) ($dados['validades'] ?? []);
        $senha = (string) $dados['senha'];
        unset($dados['senha'], $dados['aceite_privacidade'], $dados['documentos'], $dados['validades']);

        return $this->executar(function () use ($dados, $senha, $documentos, $validades, $resposta): JsonResponse {
            $this->cadastro->cadastrar($dados, $senha, $documentos, $validades, 'cadastro_publico');

            return response()->json($resposta, 201);
        });
    }
}
