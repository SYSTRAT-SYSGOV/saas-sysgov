<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Censo\Campo;
use Modules\Transporte\Censo\Leiaute;
use Modules\Transporte\Censo\Leiautes;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Models\ModeloExportacao;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\CensoService;
use Modules\Transporte\Services\SelecaoCampos;
use Modules\Transporte\Support\Vinculos;
use Symfony\Component\HttpFoundation\Response;

/** Registro 60: leiautes, pré-validação e arquivos. Tudo exige `transporte.censo.export` e é auditado (design D32). */
final class CensoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly CensoService $censo, private readonly TransportePolicy $policy) {}

    /** Catálogo de campos de cada leiaute (a observação da necessidade especial não existe nele). */
    public function leiautes(Request $request): JsonResponse
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);

        return response()->json(['data' => array_values(array_map(fn (Leiaute $l): array => [
            'chave' => $l->chave(), 'nome' => $l->nome(), 'descricao' => $l->descricao(),
            'campos' => array_map(fn (Campo $c): array => $c->descrever(), $l->campos()),
        ], Leiautes::todos()))]);
    }

    public function preValidar(Request $request): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(function () use ($dados): JsonResponse {
            [$leiaute, $selecao] = $this->selecao($dados);
            $resultado = $this->censo->preValidar((int) $dados['ano_letivo'], $leiaute, $selecao['campos']);
            $this->censo->auditar('censo.pre_validado', (int) $dados['ano_letivo'], $leiaute, [
                'linhas' => $resultado['total_linhas'], 'aprovado' => $resultado['approved'], 'resumo' => $resultado['resumo'], 'campos' => $selecao['campos'], 'campos_sensiveis' => $selecao['sensiveis'],
            ]);

            return response()->json(['data' => [...$resultado, 'campos' => $selecao['campos'], 'campos_ignorados' => $selecao['ignorados']]]);
        });
    }

    public function arquivo(Request $request): Response
    {
        return $this->gerar($request, 'arquivo');
    }

    public function conferencia(Request $request): Response
    {
        return $this->gerar($request, 'conferencia');
    }

    private function gerar(Request $request, string $tipo): Response
    {
        abort_unless($this->policy->exportarCenso($request->user()), 403);
        $dados = $request->validate($this->regras());

        return $this->executar(function () use ($dados, $tipo): Response {
            $ano = (int) $dados['ano_letivo'];
            [$leiaute, $selecao] = $this->selecao($dados);
            $conteudo = $tipo === 'arquivo'
                ? $this->censo->gerarArquivo($ano, $leiaute, $selecao['campos'])
                : $this->censo->gerarConferencia($ano, $leiaute, $selecao['campos']);
            $this->censo->auditar($tipo === 'arquivo' ? 'censo.arquivo_gerado' : 'censo.conferencia_gerada', $ano, $leiaute, [
                'tipo_arquivo' => $tipo, 'linhas' => $this->censo->linhas($ano)->count(), 'campos' => $selecao['campos'], 'campos_sensiveis' => $selecao['sensiveis'],
            ]);
            $nome = $tipo === 'arquivo' ? "transporte-censo-{$ano}-{$leiaute->chave()}.csv" : "transporte-conferencia-{$ano}.csv";

            // Sob demanda e sem guardar no servidor: o arquivo tem dados de crianças.
            return response($conteudo, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $nome . '"',
                'Cache-Control' => 'no-store, private',
            ]);
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @return array{0: Leiaute, 1: array{campos: list<string>, sensiveis: list<string>, ignorados: list<string>}}
     */
    private function selecao(array $dados): array
    {
        $leiaute = Leiautes::obter($dados['leiaute'] ?? null);
        if (isset($dados['campos'])) {
            $escolhidos = array_values($dados['campos']);
        } elseif (isset($dados['modelo_id'])) {
            $escolhidos = ModeloExportacao::query()->findOrFail($dados['modelo_id'])->campos;
        } else {
            $escolhidos = SelecaoCampos::padrao($leiaute);
        }

        return [$leiaute, SelecaoCampos::resolver($leiaute, $escolhidos, array_values($dados['confirmar_sensiveis'] ?? []))];
    }

    /** @return array<string, mixed> */
    private function regras(): array
    {
        return [
            'ano_letivo' => ['required', 'integer', 'between:2000,2100'],
            'leiaute' => ['nullable', 'string', 'max:40'],
            'modelo_id' => ['nullable', 'integer', Vinculos::existe('transporte_modelos_exportacao')],
            'campos' => ['nullable', 'array'],
            'campos.*' => ['string', 'max:60'],
            'confirmar_sensiveis' => ['nullable', 'array'],
            'confirmar_sensiveis.*' => ['string', 'max:60'],
        ];
    }
}
