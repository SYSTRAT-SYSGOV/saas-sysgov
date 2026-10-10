<?php

declare(strict_types=1);

namespace Modules\Portfolio\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\TurmaMateria;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\Concerns\RegistraMutacao;
use Modules\Portfolio\Support\Avaliacao;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class TrabalhoService
{
    use RegistraMutacao;

    public const DISCO = 'local';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array<string, mixed> $dados */
    public function criar(Aluno $aluno, array $dados, User $user): Trabalho
    {
        if ($aluno->situacao === SituacaoAluno::Transferido->value) {
            throw new DomainException('O aluno foi transferido e não recebe novos trabalhos.');
        }
        $turma = $aluno->turma_id !== null ? Turma::query()->find($aluno->turma_id) : null;
        if ($turma === null) {
            throw new DomainException('O aluno não está em nenhuma turma.');
        }
        $this->validarMateriaEData($turma, (int) $dados['materia_id'], (string) $dados['data']);
        $this->exigirLancamento($user, $turma->id, (int) $dados['materia_id']);

        return DB::transaction(function () use ($aluno, $turma, $dados, $user): Trabalho {
            $trabalho = Trabalho::create([
                'aluno_id' => $aluno->id,
                'turma_id' => $turma->id,
                'materia_id' => (int) $dados['materia_id'],
                'ano_letivo' => $turma->ano_letivo,
                'trimestre' => $this->trimestreDa((string) $dados['data'], $turma->ano_letivo),
                'titulo' => trim((string) $dados['titulo']),
                'descricao' => $dados['descricao'] ?? null,
                'observacoes' => $dados['observacoes'] ?? null,
                'data' => $dados['data'],
                'avaliacao_decimos' => Avaliacao::paraDecimos($dados['avaliacao']),
                'registrado_por' => $user->id,
            ]);
            $this->auditar('trabalho', 'criado', $trabalho->id, null, $trabalho->toArray(), ['aluno_id' => $aluno->id]);

            return $trabalho;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Trabalho $trabalho, array $dados, User $user): Trabalho
    {
        $turma = Turma::query()->withTrashed()->findOrFail($trabalho->turma_id);
        $materiaId = (int) ($dados['materia_id'] ?? $trabalho->materia_id);
        $data = (string) ($dados['data'] ?? $trabalho->data->toDateString());
        // A matéria só é revalidada quando muda: se a escola desvincular a matéria da turma depois, o trabalho
        // antigo continua editável (título, nota, observações).
        if ($materiaId !== $trabalho->materia_id) {
            $this->validarMateria($turma, $materiaId);
        }
        $this->validarData($turma, $data);
        $this->exigirLancamento($user, $turma->id, $materiaId);

        return DB::transaction(function () use ($trabalho, $dados, $materiaId, $data, $turma): Trabalho {
            $antes = $trabalho->toArray();
            $novos = array_intersect_key($dados, array_flip(['titulo', 'descricao', 'observacoes']));
            if (array_key_exists('avaliacao', $dados)) {
                $novos['avaliacao_decimos'] = Avaliacao::paraDecimos($dados['avaliacao']);
            }
            $trabalho->update([...$novos, 'materia_id' => $materiaId, 'data' => $data, 'trimestre' => $this->trimestreDa($data, $turma->ano_letivo)]);
            $this->auditar('trabalho', 'atualizado', $trabalho->id, $antes, $trabalho->toArray());

            return $trabalho;
        });
    }

    /** Exclusão lógica do trabalho; as imagens (linhas e arquivos) são removidas de imediato (design D4). */
    public function excluir(Trabalho $trabalho): void
    {
        DB::transaction(function () use ($trabalho): void {
            $antes = $trabalho->toArray();
            $caminhos = $trabalho->imagens()->pluck('path')->all();
            $trabalho->imagens()->delete();
            $trabalho->delete();
            $this->auditar('trabalho', 'excluido', $trabalho->id, $antes, null, ['imagens' => count($caminhos)]);
            DB::afterCommit(fn () => Storage::disk(self::DISCO)->delete($caminhos));
        });
    }

    private function validarMateriaEData(Turma $turma, int $materiaId, string $data): void
    {
        $this->validarMateria($turma, $materiaId);
        $this->validarData($turma, $data);
    }

    private function validarMateria(Turma $turma, int $materiaId): void
    {
        if (!TurmaMateria::query()->where('turma_id', $turma->id)->where('materia_id', $materiaId)->exists()) {
            throw ValidationException::withMessages(['materia_id' => 'A matéria não pertence à turma do aluno.']);
        }
    }

    private function validarData(Turma $turma, string $data): void
    {
        if (Carbon::parse($data)->year !== $turma->ano_letivo) {
            throw ValidationException::withMessages(['data' => "A data deve estar no ano letivo {$turma->ano_letivo}."]);
        }
    }

    private function exigirLancamento(User $user, int $turmaId, int $materiaId): void
    {
        if (!$this->escopo()->podeLancar($user, $turmaId, $materiaId)) {
            throw new HttpException(403, 'Você não pode registrar trabalhos nesta matéria.');
        }
    }

    private function trimestreDa(string $data, int $ano): ?int
    {
        $numero = Trimestre::query()->where('ano_letivo', $ano)
            ->whereDate('data_inicio', '<=', $data)->whereDate('data_fim', '>=', $data)
            ->value('numero');

        return $numero !== null ? (int) $numero : null;
    }

    private function escopo(): EscopoPortfolio
    {
        return EscopoPortfolio::daRequisicao();
    }
}
