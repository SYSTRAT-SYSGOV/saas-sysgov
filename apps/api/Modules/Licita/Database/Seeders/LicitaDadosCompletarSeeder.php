<?php

declare(strict_types=1);

namespace Modules\Licita\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Modules\Licita\Enums\StatusDfd;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\AprovacaoFinalService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\PesquisaPrecoService;

/**
 * Completa os processos já existentes do Licita para demonstração: leva o DFD
 * até a aprovação e cadastra o que faltar de ETP, Mapa de Riscos, Pesquisa de
 * Preços (com as 3 cotações da RN-006), TR e Edital. Em seguida pede a
 * aprovação final e varia o desfecho (pendente, rejeitada, aprovada).
 *
 * Ficam de propósito nas fases iniciais do DFD só 2 processos de cada
 * situação (rascunho, em revisão, rejeitado), para mostrar essas telas.
 * Idempotente: só cria o que ainda não existe e não mexe em aprovações finais
 * já solicitadas.
 *
 * Uso: php artisan db:seed --force --class='Modules\Licita\Database\Seeders\LicitaDadosCompletarSeeder'
 */
final class LicitaDadosCompletarSeeder extends LicitaDadosVolumeSeeder
{
    private const MANTER_POR_SITUACAO = 2;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a completar no Licita.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        $usuarios = $tenant->users()->orderBy('users.id')->limit(2)->get();
        [$elaborador, $aprovador] = [$usuarios->get(0), $usuarios->get(1)];
        if (!$elaborador instanceof User || !$aprovador instanceof User) {
            $this->informar('O Licita exige dois usuários distintos no tenant (elaborador e aprovador — RN-005).', aviso: true);
            return;
        }
        [$this->elaborador, $this->aprovador] = [$elaborador, $aprovador];

        $mantidos = [];
        $completados = 0;
        $desfecho = 0;

        foreach (Processo::query()->orderBy('id')->get() as $processo) {
            $dfd = $processo->dfd;
            if ($dfd === null) {
                continue;
            }

            $situacao = $dfd->status;
            if (in_array($situacao, [StatusDfd::Rascunho->value, StatusDfd::EmRevisao->value, StatusDfd::Rejeitado->value], true)) {
                $mantidos[$situacao] = ($mantidos[$situacao] ?? 0) + 1;
                if ($mantidos[$situacao] <= self::MANTER_POR_SITUACAO) {
                    continue;
                }
            }

            $this->completar($processo, $desfecho);
            $completados++;
        }

        $this->informar("{$completados} processos do Licita completados no tenant [{$tenant->id}] {$tenant->name}.");
    }

    private function completar(Processo $processo, int &$desfecho): void
    {
        $dfd = $processo->dfd;
        $objeto = (string) $dfd->objeto;

        // Leva o DFD até a aprovação (um rejeitado é reaberto e reenviado).
        if ($dfd->status === StatusDfd::Rejeitado->value) {
            $this->como($this->elaborador, fn () => app(DfdService::class)->reabrir($dfd, $this->elaborador));
            $dfd->refresh();
        }
        if ($dfd->status === StatusDfd::Rascunho->value) {
            $this->como($this->elaborador, fn () => app(DfdService::class)->enviarParaRevisao($dfd, $this->elaborador));
            $dfd->refresh();
        }
        if ($dfd->status === StatusDfd::EmRevisao->value) {
            $this->como($this->aprovador, fn () => app(DfdService::class)->aprovar($dfd, $this->aprovador, 'De acordo. Siga-se com o planejamento da contratação.'));
        }

        $processo->refresh();

        if ($processo->etp === null) {
            $this->criarEtp($processo, $objeto);
        }
        if ($processo->mapaRisco === null) {
            $this->criarMapaRiscos($processo);
        }

        $processo->refresh();
        $itens = $processo->dfd->itens ?? [];

        if ($processo->pesquisaPreco === null) {
            $this->criarPesquisa($processo, $itens, completa: true);
        } else {
            $pesquisa = $processo->pesquisaPreco;
            try {
                app(PesquisaPrecoService::class)->validarCompletude($pesquisa);
            } catch (DomainException) {
                $this->como($this->elaborador, fn () => app(PesquisaPrecoService::class)->atualizar(
                    $pesquisa,
                    ['itens' => $this->montarItensPesquisa($itens, completa: true)],
                    $this->elaborador,
                ));
            }
        }

        $processo->refresh();
        if ($processo->tr === null && $processo->edital === null) {
            $this->criarTrEEdital($processo, $objeto);
        }

        $processo->refresh();
        if ($processo->aprovacaoFinal !== null) {
            return;
        }

        $this->como($this->elaborador, fn () => app(AprovacaoFinalService::class)->solicitar($processo, $this->elaborador));

        // Desfechos: 1 em 4 fica aguardando o Ordenador, 1 em 4 é rejeitado, o resto é aprovado.
        $resultado = $desfecho++ % 4;
        if ($resultado === 1) {
            $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->rejeitar(
                $processo->refresh(),
                $this->aprovador,
                'O Edital precisa prever a cota reservada para ME/EPP (LC 123/2006, art. 48) e os critérios de sustentabilidade. Ajuste e solicite nova aprovação.',
            ));
        } elseif ($resultado !== 0) {
            $this->como($this->aprovador, fn () => app(AprovacaoFinalService::class)->aprovar(
                $processo->refresh(),
                $this->aprovador,
                'Instrução processual completa e regular. Autorizo a publicação do edital.',
            ));
        }
    }
}
