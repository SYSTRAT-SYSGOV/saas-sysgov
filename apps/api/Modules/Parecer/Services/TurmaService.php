<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Models\FuncaoTurma;
use Modules\Parecer\Models\TurmaSerie;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Série e funções de uma turma do cadastro Escola (equivale ao cadastro de turmas do PHP). */
final class TurmaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /**
     * @param array<string, int|null> $funcoes funcao => user_id (null/0 = sem ninguém)
     * @param list<int> $usuariosValidos usuários ativos do tenant
     */
    public function configurar(Turma $turma, int $serie, array $funcoes, array $usuariosValidos): TurmaSerie
    {
        if (!isset(Catalogo::SERIES[$serie])) {
            throw new DomainException('Informe a série (1º ao 5º ano).');
        }

        return DB::transaction(function () use ($turma, $serie, $funcoes, $usuariosValidos): TurmaSerie {
            $config = TurmaSerie::query()->firstOrNew(['turma_id' => $turma->id]);
            $antes = ['serie' => $config->exists ? $config->serie : null, 'funcoes' => FuncaoTurma::query()->where('turma_id', $turma->id)->pluck('user_id', 'funcao')->all()];
            $config->fill(['serie' => $serie])->save();

            foreach (array_keys(Catalogo::FUNCOES) as $funcao) {
                $uid = (int) ($funcoes[$funcao] ?? 0);
                if ($uid > 0 && in_array($uid, $usuariosValidos, true)) {
                    FuncaoTurma::query()->updateOrCreate(['turma_id' => $turma->id, 'funcao' => $funcao], ['user_id' => $uid]);
                } else {
                    FuncaoTurma::query()->where('turma_id', $turma->id)->where('funcao', $funcao)->delete();
                }
            }
            $depois = ['serie' => $serie, 'funcoes' => FuncaoTurma::query()->where('turma_id', $turma->id)->pluck('user_id', 'funcao')->all()];
            $this->auditar('turma', $antes['serie'] === null ? 'configurada' : 'editada', $turma->id, 'Turma ' . Catalogo::SERIES[$serie] . ' ' . $turma->nome . ' configurada no parecer', $antes, $depois);

            return $config;
        });
    }

    /** Tira a turma do parecer (os lançamentos ficam guardados, mas a turma some das listas). */
    public function remover(Turma $turma): void
    {
        DB::transaction(function () use ($turma): void {
            $config = TurmaSerie::query()->where('turma_id', $turma->id)->first();
            if ($config === null) {
                return;
            }
            FuncaoTurma::query()->where('turma_id', $turma->id)->delete();
            $config->delete();
            $this->auditar('turma', 'removida', $turma->id, 'Turma ' . $turma->nome . ' retirada do parecer', ['serie' => $config->serie]);
        });
    }
}
