<?php

declare(strict_types=1);

namespace Modules\Cursos\Console\Commands;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Participante;

/**
 * Limpeza diária dos cadastros externos nunca verificados (design D6): vínculo `tenant_user`
 * continua `pending` mais de 7 dias depois do cadastro público sem a pessoa clicar no link do
 * e-mail. Remove o vínculo, o papel, o Participante e os tokens de verificação desse órgão; o
 * `User` só é apagado junto se esse era o único vínculo que ele tinha em qualquer órgão (senão a
 * pessoa continua existindo pelos outros).
 */
final class LimparCadastrosPendentesCommand extends Command
{
    protected $signature = 'cursos:limpar-cadastros-pendentes';

    protected $description = 'Remove vínculos pending do cadastro externo do Cursos com mais de 7 dias e os usuários que só existiam por eles';

    public const int DIAS_LIMITE = 7;

    public function handle(TenantContext $tenantContext): int
    {
        $limite = Carbon::now()->subDays(self::DIAS_LIMITE);

        // Sem TenantContext definido ainda: o escopo global de TenantAware não filtra, então isto
        // enxerga participantes externos antigos de todos os órgãos de uma vez.
        $candidatos = Participante::query()
            ->where('origem', Participante::ORIGEM_EXTERNO)
            ->where('created_at', '<', $limite)
            ->get(['id', 'tenant_id', 'user_id']);

        $vinculosRemovidos = 0;
        $usuariosRemovidos = 0;
        $ignoradosComInscricao = 0;

        foreach ($candidatos->groupBy('tenant_id') as $tenantId => $participantesDoTenant) {
            $tenant = Tenant::find($tenantId);
            if ($tenant === null) {
                continue;
            }

            $tenantContext->set($tenant);

            try {
                foreach ($participantesDoTenant as $participante) {
                    $userId = $participante->user_id;
                    if ($userId === null) {
                        continue;
                    }

                    $aindaPendente = DB::table('tenant_user')
                        ->where('tenant_id', $tenantId)
                        ->where('user_id', $userId)
                        ->where('status', 'pending')
                        ->exists();

                    if (!$aindaPendente) {
                        // Já verificou (vínculo virou active) entre a consulta e agora, ou o vínculo
                        // já não existe mais por outro motivo — nada a limpar.
                        continue;
                    }

                    if ($participante->inscricoes()->exists()) {
                        // restrictOnDelete em cursos_inscricoes/cursos_certificados: não dá pra
                        // excluir o Participante nesse caso. Não deveria acontecer com um vínculo
                        // pending (login exige vínculo active), mas não é motivo pra derrubar o
                        // comando inteiro se acontecer.
                        $ignoradosComInscricao++;
                        continue;
                    }

                    DB::table('email_verification_tokens')->where('user_id', $userId)->where('tenant_id', $tenantId)->delete();
                    DB::table('role_user')->where('user_id', $userId)->where('tenant_id', $tenantId)->delete();
                    DB::table('tenant_user')->where('user_id', $userId)->where('tenant_id', $tenantId)->delete();
                    $participante->delete();
                    $vinculosRemovidos++;

                    if (!DB::table('tenant_user')->where('user_id', $userId)->exists()) {
                        User::where('id', $userId)->delete();
                        $usuariosRemovidos++;
                    }
                }
            } finally {
                $tenantContext->clear();
            }
        }

        $this->info("{$vinculosRemovidos} vínculos pending removidos, {$usuariosRemovidos} usuários removidos, {$ignoradosComInscricao} ignorados por já ter inscrição.");

        return self::SUCCESS;
    }
}
