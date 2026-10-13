<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Services;

use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Models\ParcelamentoMulta;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;

/**
 * Trilha de auditoria consolidada de um processo de licenciamento ou de um auto de
 * infração ambiental. `AuditLog` não é polimórfico em nenhum módulo do monorepo: cada
 * registro é encontrado pelo texto de `resource`, que os Services do módulo gravam
 * sempre como "<Entidade> #<id>" seguido, nos registros filhos, do pai entre
 * parênteses (ex. "Condicionante #3 (ProcessoLicenciamento #1)"). O casamento usa
 * `resource = prefixo` ou `resource LIKE 'prefixo %'` — o espaço de ancoragem evita que
 * "Condicionante #1" capture "Condicionante #10" (mesma técnica de
 * `Vistoria\Services\AuditoriaVistoriaService`).
 */
final readonly class AuditoriaMeioAmbienteService
{
    private const MODULO = 'meio_ambiente';
    private const MODULO_VISTORIA = 'vistoria';

    public function __construct(private TenantContext $tenantContext) {}

    /**
     * Processo + documentos anexados, condicionantes, vistorias técnicas e a compensação
     * ambiental gerada no deferimento (com pagamentos e destinações).
     *
     * @return list<array<string, mixed>>
     */
    public function trilhaDoProcessoLicenciamento(ProcessoLicenciamento $processo): array
    {
        $processo->loadMissing(['documentos', 'condicionantes', 'vistoriasTecnicas', 'compensacaoAmbiental.pagamentos', 'compensacaoAmbiental.destinacoes']);

        $prefixos = ["ProcessoLicenciamento #{$processo->id}"];
        foreach ($processo->documentos as $documento) {
            $prefixos[] = "DocumentoLicenciamento #{$documento->id}";
        }
        foreach ($processo->condicionantes as $condicionante) {
            $prefixos[] = "Condicionante #{$condicionante->id}";
        }
        foreach ($processo->vistoriasTecnicas as $vistoria) {
            $prefixos[] = "VistoriaTecnicaLicenciamento #{$vistoria->id}";
        }
        if ($compensacao = $processo->compensacaoAmbiental) {
            $prefixos[] = "CompensacaoAmbiental #{$compensacao->id}";
            foreach ($compensacao->pagamentos as $pagamento) {
                $prefixos[] = "PagamentoCompensacao #{$pagamento->id}";
            }
            foreach ($compensacao->destinacoes as $destinacao) {
                $prefixos[] = "DestinacaoCompensacao #{$destinacao->id}";
            }
        }

        return $this->buscar([self::MODULO => $prefixos]);
    }

    /**
     * Auto de infração + o documento e o processo sancionatório correspondentes no módulo
     * Vistoria (defesa, julgamento, recurso), o parcelamento da multa com suas parcelas e,
     * quando o auto nasceu de uma ocorrência de queimada, essa ocorrência.
     *
     * @return list<array<string, mixed>>
     */
    public function trilhaDoAutoInfracao(AutoInfracaoAmbiental $auto): array
    {
        $auto->loadMissing('documento.processoSancionatorio');

        $prefixosModulo = ["AutoInfracaoAmbiental #{$auto->id}"];
        $prefixosVistoria = ["Documento #{$auto->documento_id}"];

        $processo = $auto->documento->processoSancionatorio;
        if ($processo !== null) {
            $prefixosVistoria[] = "ProcessoSancionatorio #{$processo->id}";

            $parcelamento = ParcelamentoMulta::with('parcelas')->where('processo_sancionatorio_id', $processo->id)->first();
            if ($parcelamento !== null) {
                $prefixosModulo[] = "ParcelamentoMulta #{$parcelamento->id}";
                foreach ($parcelamento->parcelas as $parcela) {
                    $prefixosModulo[] = "ParcelaMulta #{$parcela->id}";
                }
            }
        }

        foreach (OcorrenciaQueimada::where('auto_infracao_ambiental_id', $auto->id)->pluck('id') as $ocorrenciaId) {
            $prefixosModulo[] = "OcorrenciaQueimada #{$ocorrenciaId}";
        }

        return $this->buscar([self::MODULO => $prefixosModulo, self::MODULO_VISTORIA => $prefixosVistoria]);
    }

    /**
     * @param array<string, list<string>> $prefixosPorModulo
     *
     * @return list<array<string, mixed>>
     */
    private function buscar(array $prefixosPorModulo): array
    {
        $registros = AuditLog::query()
            ->where('tenant_id', $this->tenantContext->id())
            ->where(function (Builder $query) use ($prefixosPorModulo): void {
                foreach ($prefixosPorModulo as $modulo => $prefixos) {
                    $query->orWhere(function (Builder $doModulo) use ($modulo, $prefixos): void {
                        $doModulo->where('module', $modulo)->where(function (Builder $recurso) use ($prefixos): void {
                            foreach ($prefixos as $prefixo) {
                                $recurso->orWhere('resource', $prefixo)->orWhere('resource', 'like', "{$prefixo} %");
                            }
                        });
                    });
                }
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'user_id', 'module', 'action', 'resource', 'before', 'after', 'ip', 'created_at']);

        $usuarios = User::query()->whereIn('id', $registros->pluck('user_id')->filter()->unique())->pluck('name', 'id');

        return $registros->map(fn (AuditLog $registro): array => [
            'id' => $registro->id,
            'modulo' => $registro->module,
            'acao' => $registro->action,
            'recurso' => $registro->resource,
            'usuario' => $registro->user_id === null ? null : ['id' => $registro->user_id, 'nome' => $usuarios[$registro->user_id] ?? null],
            'antes' => $registro->before,
            'depois' => $registro->after,
            'ip' => $registro->ip,
            'registrado_em' => $registro->created_at->toIso8601String(),
        ])->values()->all();
    }
}
