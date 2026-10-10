<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Campanha\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Campanha\Models\Lancamento;
use Modules\Campanha\Services\AnexoService;
use Modules\Campanha\Services\FinanceiroService;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Livro-caixa com os campos da prestação de contas, resumo, exportação e comprovantes. */
final class FinanceiroController extends Controller
{
    use RespondeErroDeNegocio;

    private const POR_PAGINA = 50;

    public function __construct(
        private readonly FinanceiroService $financeiro,
        private readonly AnexoService $anexos,
    ) {}

    public function opcoes(): JsonResponse
    {
        $this->authorize('viewAny', Lancamento::class);

        return response()->json([
            'categorias' => Lancamento::CATEGORIAS, 'origens' => Lancamento::ORIGENS,
            'formas' => Lancamento::FORMAS, 'documentos_fiscais' => Lancamento::DOCUMENTOS_FISCAIS,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lancamento::class);
        $pagina = $this->financeiro->consulta($this->filtros($request))->paginate(self::POR_PAGINA, ['*'], 'pagina');

        return response()->json(['lancamentos' => $pagina->items(), 'total' => $pagina->total(), 'pagina' => $pagina->currentPage(), 'por_pagina' => self::POR_PAGINA]);
    }

    public function resumo(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Lancamento::class);

        return response()->json($this->financeiro->resumo($this->filtros($request)));
    }

    public function exportar(Request $request): StreamedResponse
    {
        $this->authorize('viewAny', Lancamento::class);
        $linhas = $this->financeiro->exportar($this->filtros($request));

        return response()->streamDownload(function () use ($linhas): void {
            $saida = fopen('php://output', 'w');
            if ($saida === false) {
                return;
            }
            fwrite($saida, "\xEF\xBB\xBF");
            foreach ($linhas as $linha) {
                fputcsv($saida, $linha, ';', '"', '');
            }
            fclose($saida);
        }, 'livro-caixa-' . now()->format('Y-m-d') . '.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Lancamento::class);

        return $this->executar(fn () => response()->json($this->financeiro->salvar(null, $request->validate($this->regras())), 201));
    }

    public function update(Request $request, Lancamento $lancamento): JsonResponse
    {
        $this->authorize('update', $lancamento);

        return $this->executar(fn () => response()->json($this->financeiro->salvar($lancamento, $request->validate($this->regras(parcial: true)))));
    }

    public function destroy(Lancamento $lancamento): JsonResponse
    {
        $this->authorize('delete', $lancamento);
        $this->financeiro->excluir($lancamento);

        return response()->json(['deleted' => true]);
    }

    public function enviarComprovante(Request $request, Lancamento $lancamento): JsonResponse
    {
        $this->authorize('update', $lancamento);
        $request->validate(['arquivo' => AnexoService::REGRA]);

        return $this->executar(fn () => response()->json($this->anexos->guardar($lancamento, 'comprovante', 'lancamento', $request->file('arquivo'))));
    }

    public function comprovante(Lancamento $lancamento): Response
    {
        $this->authorize('arquivo', $lancamento);

        return $this->anexos->resposta($lancamento, 'comprovante', "comprovante-{$lancamento->id}") ?? response()->json(['error' => 'Este lançamento não tem comprovante.'], 404);
    }

    /** @return array<string, mixed> */
    private function filtros(Request $request): array
    {
        return $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'tipo' => ['nullable', Rule::in(['receita', 'despesa'])],
            'categoria' => ['nullable', 'string', 'max:40'],
            'origem_recurso' => ['nullable', Rule::in(array_keys(Lancamento::ORIGENS))],
            'codigo_ibge' => ['nullable', 'integer'],
            'busca' => ['nullable', 'string', 'max:100'],
        ]);
    }

    /** @return array<string, mixed> */
    private function regras(bool $parcial = false): array
    {
        $obrigatorio = $parcial ? 'sometimes' : 'required';

        return [
            'tipo' => [$obrigatorio, Rule::in(['receita', 'despesa'])],
            'categoria' => [$obrigatorio, 'string', 'max:40'],
            'valor_centavos' => [$obrigatorio, 'integer', 'min:1'],
            'data' => [$obrigatorio, 'date_format:Y-m-d'],
            'forma_pagamento' => [$obrigatorio, Rule::in(array_keys(Lancamento::FORMAS))],
            'codigo_ibge' => ['sometimes', 'nullable', 'integer'],
            'contraparte_nome' => ['sometimes', 'nullable', 'string', 'max:200'],
            'contraparte_documento' => ['sometimes', 'nullable', 'string', 'max:20'],
            'origem_recurso' => ['sometimes', 'nullable', Rule::in(array_keys(Lancamento::ORIGENS))],
            'recibo_eleitoral' => ['sometimes', 'nullable', 'string', 'max:60'],
            'documento_fiscal_tipo' => ['sometimes', 'nullable', Rule::in(array_keys(Lancamento::DOCUMENTOS_FISCAIS))],
            'documento_fiscal_numero' => ['sometimes', 'nullable', 'string', 'max:60'],
            'material_id' => ['sometimes', 'nullable', 'integer'],
            'observacoes' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
