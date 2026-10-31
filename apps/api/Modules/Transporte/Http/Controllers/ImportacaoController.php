<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Http\Controllers\Concerns\RespondeErroDeNegocio;
use Modules\Transporte\Jobs\ProcessarImportacaoJob;
use Modules\Transporte\Models\Importacao;
use Modules\Transporte\Policies\TransportePolicy;
use Modules\Transporte\Services\ImportacaoTransporteService;
use Modules\Transporte\Support\ConflitoException;
use Symfony\Component\HttpFoundation\Response;

/** Importação por CSV: veículos e motoristas pedem `frota.manage`; paradas pedem `rotas.manage`. */
final class ImportacaoController extends Controller
{
    use RespondeErroDeNegocio;

    public function __construct(private readonly ImportacaoTransporteService $servico, private readonly TransportePolicy $policy) {}

    public function modelo(Request $request, string $tipo): Response
    {
        $this->autorizar($request, $tipo);

        return $this->executar(fn () => response($this->servico->modelo($tipo), 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="modelo-transporte-' . $tipo . '.csv"',
        ]));
    }

    public function previa(Request $request, string $tipo): Response
    {
        $this->autorizar($request, $tipo);
        $request->validate(['arquivo' => ['required', 'file', 'mimes:csv,txt', 'max:2048']]);

        return $this->executar(fn () => response()->json(['data' => $this->formatar($this->servico->previa($tipo, $request->file('arquivo'), $request->user()?->id))], 201));
    }

    public function confirmar(Request $request, Importacao $importacao): Response
    {
        $this->autorizar($request, $importacao->tipo);

        return $this->executar(function () use ($importacao): JsonResponse {
            if ($importacao->status !== 'previa') {
                throw new ConflitoException('Esta importação já foi confirmada ou cancelada. Envie o arquivo de novo.');
            }
            $importacao->update(['status' => 'na_fila']);
            // Só processa pela fila: com a conexão `sync` o job roda na hora, com um worker ele roda em segundo plano.
            ProcessarImportacaoJob::dispatch($importacao->id, app(TenantContext::class)->id());

            return response()->json(['data' => $this->formatar($importacao->refresh())], 202);
        });
    }

    public function show(Request $request, Importacao $importacao): JsonResponse
    {
        $this->autorizar($request, $importacao->tipo);

        return response()->json(['data' => $this->formatar($importacao)]);
    }

    public function cancelar(Request $request, Importacao $importacao): Response
    {
        $this->autorizar($request, $importacao->tipo);

        return $this->executar(function () use ($importacao): JsonResponse {
            if ($importacao->status !== 'previa') {
                throw new ConflitoException('Só dá para cancelar uma importação que ainda não foi confirmada.');
            }
            $this->servico->apagarArquivo($importacao);
            $importacao->update(['status' => 'cancelada']);

            return response()->json(['data' => $this->formatar($importacao->refresh())]);
        });
    }

    private function autorizar(Request $request, string $tipo): void
    {
        $permitido = $tipo === 'paradas' ? $this->policy->gerenciarRotas($request->user()) : $this->policy->gerenciarFrota($request->user());
        abort_unless(in_array($tipo, ImportacaoTransporteService::TIPOS, true) && $permitido, 403);
    }

    /** @return array<string, mixed> */
    private function formatar(Importacao $i): array
    {
        return [
            'id' => $i->id, 'tipo' => $i->tipo, 'arquivo' => $i->arquivo_nome, 'status' => $i->status,
            'total' => $i->total, 'validas' => $i->validas, 'criadas' => $i->criadas, 'ignoradas' => $i->ignoradas, 'com_erro' => $i->com_erro,
            'divergencias' => $i->relatorio['divergencias'] ?? [], 'avisos' => $i->relatorio['avisos'] ?? [], 'truncado' => $i->relatorio['truncado'] ?? false,
            'mensagem' => $i->mensagem, 'concluida_em' => $i->concluida_em?->toIso8601String(),
        ];
    }
}
