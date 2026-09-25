<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\Modalidade;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;

final class TurmaService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
        private readonly InscricaoService $inscricoes,
    ) {}

    /**
     * @param array<string, mixed> $dados
     * @param list<int> $instrutorIds
     */
    public function criar(Curso $curso, array $dados, array $instrutorIds): Turma
    {
        if ($curso->statusEnum()->is(StatusCurso::Encerrado)) {
            throw new DomainException('Não é possível criar turma para um curso encerrado.');
        }

        // Turma cancelada não conta: um evento cancelado pode ser remarcado.
        if ($curso->tipoEnum() === TipoCurso::Evento
            && $curso->turmas()->where('status', '!=', StatusTurma::Cancelada->value)->exists()) {
            throw new DomainException('Eventos têm turma única — este evento já tem uma turma.');
        }

        $this->validarDados($dados);
        $this->validarInstrutores($instrutorIds);

        return DB::transaction(function () use ($curso, $dados, $instrutorIds): Turma {
            $turma = $curso->turmas()->create([...$dados, 'status' => StatusTurma::Aberta->value]);
            $turma->instrutores()->sync($this->pivotInstrutores($instrutorIds));
            $turma->load('instrutores');

            $this->audit->record('cursos', 'turma.criada', "Turma #{$turma->id}", null, $turma->toArray());
            $this->outbox->publish('cursos.TurmaCriada', ['id' => $turma->id, 'curso_id' => $curso->id]);

            return $turma;
        });
    }

    /**
     * @param array<string, mixed> $dados
     * @param list<int>|null $instrutorIds null = mantém os instrutores
     */
    public function atualizar(Turma $turma, array $dados, ?array $instrutorIds = null): Turma
    {
        $this->garantirAberta($turma);

        $mesclado = [...$turma->only(['data_inicio', 'data_fim', 'inscricoes_inicio', 'inscricoes_fim', 'vagas', 'modalidade', 'local', 'link']), ...$dados];
        $this->validarDados($mesclado);
        if ($instrutorIds !== null) {
            $this->validarInstrutores($instrutorIds);
        }

        $ocupadas = $turma->inscricoes()->whereIn('status', StatusInscricao::valoresQueOcupamVaga())->count();
        if (isset($dados['vagas']) && (int) $dados['vagas'] < $ocupadas) {
            throw new DomainException("A turma já tem {$ocupadas} vagas ocupadas; o número de vagas não pode ficar abaixo disso.");
        }

        $turma = DB::transaction(function () use ($turma, $dados, $instrutorIds): Turma {
            $antes = $turma->load('instrutores')->toArray();
            $turma->update($dados);
            if ($instrutorIds !== null) {
                $turma->instrutores()->sync($this->pivotInstrutores($instrutorIds));
            }
            $turma->load('instrutores');

            $this->audit->record('cursos', 'turma.atualizada', "Turma #{$turma->id}", $antes, $turma->toArray());

            return $turma;
        });

        // Vagas a mais liberam lugares para a lista de espera.
        $this->inscricoes->preencherVagas($turma);

        return $turma;
    }

    public function cancelar(Turma $turma, User $user, string $motivo): Turma
    {
        if (!$turma->statusEnum()->podeTransicionarPara(StatusTurma::Cancelada)) {
            throw new DomainException('Só turmas abertas podem ser canceladas.');
        }

        return DB::transaction(function () use ($turma, $user, $motivo): Turma {
            $turma->update(['status' => StatusTurma::Cancelada->value]);

            $turma->inscricoes()->whereIn('status', StatusInscricao::valoresAtivos())->update([
                'status' => StatusInscricao::Cancelada->value,
                'cancelada_por' => $user->id,
                'cancelada_em' => now(),
                'motivo_cancelamento' => 'Turma cancelada: ' . $motivo,
            ]);

            $this->audit->record('cursos', 'turma.cancelada', "Turma #{$turma->id}", null, ['motivo' => $motivo]);
            $this->outbox->publish('cursos.TurmaCancelada', ['id' => $turma->id, 'motivo' => $motivo]);

            return $turma;
        });
    }

    public function agendar(Turma $turma, Aula $aula, string $inicio, string $fim): AulaAgendamento
    {
        $this->garantirAberta($turma);

        if ($aula->curso_id !== $turma->curso_id) {
            throw new DomainException('A aula não pertence ao curso desta turma.');
        }

        $ini = CarbonImmutable::parse($inicio);
        $fi = CarbonImmutable::parse($fim);
        if ($fi->lessThanOrEqualTo($ini)) {
            throw new DomainException('O fim da aula deve ser depois do início.');
        }
        if ($ini->toDateString() < $turma->data_inicio->toDateString() || $fi->toDateString() > $turma->data_fim->toDateString()) {
            throw new DomainException('A aula precisa ser agendada dentro do período da turma ('
                . $turma->data_inicio->format('d/m/Y') . ' a ' . $turma->data_fim->format('d/m/Y') . ').');
        }

        return DB::transaction(function () use ($turma, $aula, $ini, $fi): AulaAgendamento {
            $existente = AulaAgendamento::query()->where('turma_id', $turma->id)->where('aula_id', $aula->id)->first();
            $antes = $existente?->toArray();

            $agendamento = AulaAgendamento::updateOrCreate(
                ['turma_id' => $turma->id, 'aula_id' => $aula->id],
                ['inicio' => $ini, 'fim' => $fi],
            );

            $this->audit->record('cursos', 'aula.agendada', "AulaAgendamento #{$agendamento->id}", $antes, $agendamento->toArray());

            return $agendamento;
        });
    }

    public function removerAgendamento(AulaAgendamento $agendamento): void
    {
        $this->garantirAberta($agendamento->turma);

        if ($agendamento->presencas()->exists()) {
            throw new DomainException('Esta aula já tem presenças registradas e não pode ser desagendada.');
        }

        DB::transaction(function () use ($agendamento): void {
            $antes = $agendamento->toArray();
            $agendamento->delete();
            $this->audit->record('cursos', 'aula.desagendada', "AulaAgendamento #{$antes['id']}", $antes, null);
        });
    }

    private function garantirAberta(Turma $turma): void
    {
        if (!$turma->statusEnum()->is(StatusTurma::Aberta)) {
            throw new DomainException('Turma ' . mb_strtolower($turma->statusEnum()->label()) . ' não pode ser alterada.');
        }
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function validarDados(array $dados): void
    {
        $inicio = CarbonImmutable::parse($dados['data_inicio']);
        $fim = CarbonImmutable::parse($dados['data_fim']);
        if ($fim->lessThan($inicio)) {
            throw new DomainException('A data de fim da turma não pode ser anterior à data de início.');
        }

        if (CarbonImmutable::parse($dados['inscricoes_fim'])->lessThanOrEqualTo(CarbonImmutable::parse($dados['inscricoes_inicio']))) {
            throw new DomainException('O fim do período de inscrição deve ser depois do início.');
        }

        if ((int) $dados['vagas'] < 1) {
            throw new DomainException('A turma precisa de ao menos uma vaga.');
        }

        $modalidade = Modalidade::from((string) $dados['modalidade']);
        if ($modalidade->exigeLocal() && blank($dados['local'] ?? null)) {
            throw new DomainException("O local é obrigatório para turmas na modalidade {$modalidade->label()}.");
        }
        if ($modalidade->exigeLink() && blank($dados['link'] ?? null)) {
            throw new DomainException("O link é obrigatório para turmas na modalidade {$modalidade->label()}.");
        }
    }

    /**
     * @param list<int> $instrutorIds
     */
    private function validarInstrutores(array $instrutorIds): void
    {
        $ids = array_values(array_unique(array_map('intval', $instrutorIds)));
        if ($ids === []) {
            throw new DomainException('A turma precisa de ao menos um instrutor.');
        }

        $tenantId = $this->tenantContext->id();
        $validos = User::query()
            ->whereIn('id', $ids)
            ->where('is_active', true)
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_user.status', 'active'))
            ->count();

        if ($validos !== count($ids)) {
            throw new DomainException('Os instrutores precisam ser usuários ativos deste órgão.');
        }
    }

    /**
     * @param list<int> $instrutorIds
     * @return array<int, array{tenant_id: int}>
     */
    private function pivotInstrutores(array $instrutorIds): array
    {
        $tenantId = $this->tenantContext->id();

        return collect($instrutorIds)->unique()->mapWithKeys(fn (int $id): array => [$id => ['tenant_id' => $tenantId]])->all();
    }
}
