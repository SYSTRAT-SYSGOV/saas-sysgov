<?php

declare(strict_types=1);

namespace Modules\Pessoas\Console;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Modules\Pessoas\Services\PessoaDoUsuarioService;

/**
 * Dá pessoa aos usuários de órgão que já existiam antes de o admin criar a pessoa junto (PessoaDoUsuarioService):
 * cria a pessoa sem documento ou pareia pelo e-mail. Usuários da plataforma e usuários inativos no órgão ficam de fora.
 * Sempre rode antes com --dry-run: o relatório é o que a execução real faria, sem gravar nada. Pode repetir: quem já
 * tem pessoa não muda.
 */
final class VincularUsuariosPessoasCommand extends Command
{
    protected $signature = 'pessoas:vincular-usuarios {--tenant= : Só este tenant (slug)} {--dry-run : Mostra o que faria sem gravar}';

    protected $description = 'Cria ou pareia a pessoa dos usuários de órgão que ainda não têm uma';

    public function handle(PessoaDoUsuarioService $servico): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $tenants = Tenant::query()->when($this->option('tenant'), fn ($q, $slug) => $q->where('slug', $slug))->get();
        if ($tenants->isEmpty()) {
            $this->error('Nenhum tenant encontrado.');

            return self::FAILURE;
        }

        foreach ($tenants as $tenant) {
            $usuarios = User::query()
                ->where('is_systrat', false)
                ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id)->where('tenant_user.status', 'active'))
                ->orderBy('id')
                ->get();

            $linhas = [];
            foreach ($usuarios as $usuario) {
                $situacao = $servico->situacao($usuario, $tenant);
                $resultado = $situacao;
                if (! $dryRun && in_array($situacao, ['criar', 'parear'], true)) {
                    $pessoa = $servico->garantir($usuario, $tenant, null, 'backfill');
                    $resultado = $pessoa === null ? 'falhou' : ($situacao === 'criar' ? 'pessoa criada' : 'pareado') . " (pessoa #{$pessoa->id})";
                }
                $linhas[] = [$usuario->id, $usuario->email, $situacao, $dryRun ? '-' : $resultado];
            }

            $this->line(($dryRun ? '[DRY-RUN] ' : '') . "Tenant {$tenant->slug} — {$usuarios->count()} usuário(s)");
            $this->table(['Usuário', 'E-mail', 'Situação', 'Resultado'], $linhas);
        }

        return self::SUCCESS;
    }
}
