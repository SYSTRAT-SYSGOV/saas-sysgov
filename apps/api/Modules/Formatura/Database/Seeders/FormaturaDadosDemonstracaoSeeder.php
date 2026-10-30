<?php

declare(strict_types=1);

namespace Modules\Formatura\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Services\ConfiguracaoService;
use Modules\Formatura\Services\FormandoService;
use Modules\Formatura\Services\PagamentoService;

/**
 * Massa de dados de demonstração da Formatura: para cada escola que tem turma de 9º ano, a
 * configuração do ano (valor por pessoa, convidados, parcelas, PIX e formas de pagamento), a
 * participação dos alunos (alguns não participam; convidados de 0 a 3) e pagamentos em todas as
 * situações financeiras: quitado, parcial e pendente.
 *
 * Tudo passa pelos Services do módulo (turma formanda, parcelas máximas, formas aceitas, auditoria).
 * A chave PIX é fictícia.
 *
 * Uso: php artisan db:seed --force --class='Modules\Formatura\Database\Seeders\FormaturaDadosDemonstracaoSeeder'
 * Depende do Cadastro Escolar (EscolaDadosDemonstracaoSeeder). Pula a escola que já tiver
 * configuração de formatura para a mesma escola e ano (a configuração feita à mão em outra escola não impede).
 */
final class FormaturaDadosDemonstracaoSeeder extends Seeder
{
    private const FORMAS = ['pix', 'dinheiro', 'boleto', 'cartao_credito'];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear na Formatura.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        $turmas = DB::table('escola_turmas')->where('tenant_id', $tenant->id)->whereNull('deleted_at')
            ->where('nome', 'like', '9%')->orderBy('id')->get(['id', 'escola_id', 'ano_letivo']);
        if ($turmas->isEmpty()) {
            $this->informar('Não há turma de 9º ano — execute antes o EscolaDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $totais = ['configuracoes' => 0, 'formandos' => 0, 'pagamentos' => 0];

        DB::transaction(function () use ($turmas, $usuario, &$totais): void {
            foreach ($turmas as $turma) {
                // Uma formatura já configurada para a escola e o ano (à mão ou por uma execução anterior) não é tocada.
                if (DB::table('formatura_configuracoes')->where('escola_id', $turma->escola_id)->where('ano_letivo', $turma->ano_letivo)->exists()) {
                    continue;
                }
                app(EscolaContext::class)->set(Escola::query()->findOrFail($turma->escola_id));
                $this->semearTurma((int) $turma->id, (int) $turma->ano_letivo, $usuario, $totais);
            }
        });

        app(EscolaContext::class)->clear();

        if ($totais['configuracoes'] === 0) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem a formatura das turmas de 9º ano — nada a fazer.");
            return;
        }

        $this->informar("Formatura de demonstração criada no tenant [{$tenant->id}] {$tenant->name}: {$totais['configuracoes']} configuração, {$totais['formandos']} participações e {$totais['pagamentos']} pagamentos.");
    }

    /** @param array<string, int> $totais */
    private function semearTurma(int $turmaId, int $ano, User $usuario, array &$totais): void
    {
        $configuracao = app(ConfiguracaoService::class)->salvar([
            'ano_letivo' => $ano,
            'titulo' => "Formatura do 9º ano {$ano}",
            'tipo_calculo' => 'por_pessoa',
            'valor_base_centavos' => 18000,
            'valor_pessoa_extra_centavos' => 9000,
            'convidados_incluidos_padrao' => 2,
            'max_parcelas' => 6,
            'chaves_pix' => ['formatura@escola.exemplo.gov.br'],
            'formas_pagamento' => self::FORMAS,
            'turmas_ids' => [$turmaId],
        ]);
        $totais['configuracoes']++;

        $formandos = app(FormandoService::class);
        $pagamentos = app(PagamentoService::class);
        $hoje = CarbonImmutable::today();
        $alunos = Aluno::query()->where('turma_id', $turmaId)->where('situacao', '!=', 'transferido')->orderBy('id')->get();

        foreach ($alunos as $i => $aluno) {
            $participa = $i % 10 !== 9;
            $formandos->salvarParticipacao($configuracao, $aluno, [
                'participa' => $participa,
                'convidados' => $participa ? $i % 4 : 0,
                'observacoes' => $participa && $i % 7 === 0 ? 'Família pediu mesa próxima ao palco.' : null,
            ]);
            $totais['formandos']++;
            if (!$participa) {
                continue;
            }

            $participacao = Participacao::query()->where('configuracao_id', $configuracao->id)->where('aluno_id', $aluno->id)->firstOrFail();
            $devido = (int) $formandos->linha($aluno, $participacao, $configuracao)['valor_devido_centavos'];

            // 0: quitado (6 parcelas), 1: parcial, 2: parcial, 3: pendente (nada pago)
            $perfil = $i % 4;
            $parcelasPagas = match ($perfil) { 0 => 6, 1 => 4, 2 => 2, default => 0 };
            if ($parcelasPagas === 0 || $devido === 0) {
                continue;
            }
            $parcela = intdiv($devido, 6);
            for ($n = 1; $n <= $parcelasPagas; $n++) {
                $forma = self::FORMAS[($i + $n) % count(self::FORMAS)];
                $valor = $perfil === 0 && $n === 6 ? $devido - 5 * $parcela : $parcela;
                $pagamentos->registrar($configuracao, $aluno, [
                    'numero_parcela' => $n,
                    'data_pagamento' => $hoje->subDays(30 * (6 - $n) + 2 + $i % 5)->toDateString(),
                    'valor_centavos' => $valor,
                    'forma_pagamento' => $forma,
                    'chave_pix' => $forma === 'pix' ? 'formatura@escola.exemplo.gov.br' : null,
                    'observacao' => null,
                ], $usuario);
                $totais['pagamentos']++;
            }
        }
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
