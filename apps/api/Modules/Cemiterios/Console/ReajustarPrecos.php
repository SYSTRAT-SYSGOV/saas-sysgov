<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Console;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Modules\Cemiterios\Listeners\EnviarEmail;
use Modules\Cemiterios\Models\Reajuste;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\PorTenant;
use RuntimeException;
use Throwable;

/**
 * RF-21 — reajuste anual pelo IPCA acumulado de 12 meses (API SGS do Banco
 * Central, série 433), vigente a partir de 1º/jan da competência. Idempotente
 * por competência; em falha da API nada muda e o Financeiro é avisado.
 */
final class ReajustarPrecos extends Command
{
    protected $signature = 'cemiterios:reajustar-precos {--competencia= : Ano em que o reajuste entra em vigor (padrão: próximo ano)}';

    protected $description = 'Reajusta a tabela de preços pelo IPCA acumulado de 12 meses';

    public function handle(): int
    {
        $competencia = (int) ($this->option('competencia') ?: now()->year + 1);

        try {
            $percentual = $this->ipcaAcumulado();
        } catch (Throwable $e) {
            Log::error("cemiterios: falha ao obter o IPCA para {$competencia}: {$e->getMessage()}");
            PorTenant::executar(fn (Tenant $t) => $this->avisarFinanceiro($t, $competencia));
            $this->error('Índice indisponível; nenhum preço foi alterado.');

            return self::FAILURE;
        }

        PorTenant::executar(function (Tenant $t) use ($competencia, $percentual): void {
            if (Reajuste::where('competencia', $competencia)->exists()) {
                $this->line("{$t->slug}: competência {$competencia} já reajustada");

                return;
            }
            app(PrecoService::class)->reajustar($competencia, $percentual, 'automatica', null);
            $this->line("{$t->slug}: tabela reajustada em {$percentual}%");
        });

        return self::SUCCESS;
    }

    /** Variação acumulada dos últimos 12 meses, com 4 casas decimais. */
    private function ipcaAcumulado(): string
    {
        $serie = Http::timeout(20)->retry(2, 1000)->get((string) config('cemiterios.ipca_url'))->throw()->json();

        if (!is_array($serie) || count($serie) !== 12) {
            throw new RuntimeException('Série do IPCA incompleta.');
        }

        $fator = array_reduce($serie, fn (float $f, array $mes) => $f * (1 + (float) str_replace(',', '.', (string) $mes['valor']) / 100), 1.0);

        return number_format(($fator - 1) * 100, 4, '.', '');
    }

    private function avisarFinanceiro(Tenant $tenant, int $competencia): void
    {
        if (Reajuste::where('competencia', $competencia)->exists()) {
            return;
        }

        User::ofTenant($tenant->id)->get()
            ->filter(fn (User $u) => $u->hasPermission('cemiterios.financeiro.manage', $tenant->id))
            ->each(fn (User $u) => EnviarEmail::agendar(
                $u->email,
                "Reajuste {$competencia} da tabela de cemitérios não aplicado",
                "A consulta ao IPCA (Banco Central) falhou. Nenhum preço foi alterado; uma nova tentativa ocorre amanhã. "
                . 'Se preferir, aplique o reajuste manualmente em Gestão de Cemitérios › Financeiro.'
            ));
    }
}
