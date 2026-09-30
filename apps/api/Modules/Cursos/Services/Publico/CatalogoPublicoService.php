<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Publico;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\InscricaoService;

/**
 * Oferta pública do órgão (design D7, "Turmas abertas ao público externo"): só cursos
 * publicados com pelo menos uma turma `aberta`, `aceita_externos` e dentro do período de
 * inscrição. Cada campo é listado a mão — nunca `$model->toArray()` — pra nenhum campo interno
 * (e-mail de instrutor, vagas totais) vazar por acidente quando o model ganhar uma coluna nova.
 */
final class CatalogoPublicoService
{
    public function __construct(private readonly InscricaoService $inscricoes) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function listar(?string $tipo = null): array
    {
        $cursos = Curso::query()
            ->where('status', StatusCurso::Publicado->value)
            ->when($tipo, fn (Builder $q) => $q->where('tipo', $tipo))
            ->with(['turmas' => fn ($q) => $this->turmasQualificadas($q)])
            ->orderBy('titulo')
            ->get()
            ->filter(fn (Curso $curso): bool => $curso->turmas->isNotEmpty())
            ->values();

        return $cursos->map(fn (Curso $curso): array => $this->resumoCurso($curso))->all();
    }

    /**
     * @return array<string, mixed>|null null quando o curso não existe, não está publicado, ou o slug não bate
     */
    public function curso(string $slug): ?array
    {
        $curso = Curso::query()
            ->where('status', StatusCurso::Publicado->value)
            ->where('slug', $slug)
            ->with(['turmas' => fn ($q) => $this->turmasQualificadas($q)])
            ->first();

        if ($curso === null) {
            return null;
        }

        return [
            ...$this->resumoCurso($curso),
            'descricao' => $curso->descricao,
            'texto_publico' => $curso->texto_publico,
            'turmas' => $curso->turmas->map(fn (Turma $turma): array => $this->resumoTurma($turma))->values()->all(),
        ];
    }

    /**
     * @param Builder<Turma>|Relation<Turma, Curso, *> $query
     * @return Builder<Turma>|Relation<Turma, Curso, *>
     */
    private function turmasQualificadas(Builder|Relation $query): Builder|Relation
    {
        $agora = now();

        return $query
            ->where('status', StatusTurma::Aberta->value)
            ->where('aceita_externos', true)
            ->where('inscricoes_inicio', '<=', $agora)
            ->where('inscricoes_fim', '>=', $agora)
            ->orderBy('data_inicio');
    }

    /**
     * @return array<string, mixed>
     */
    private function resumoCurso(Curso $curso): array
    {
        return [
            'slug' => $curso->slug,
            'tipo' => $curso->tipo,
            'titulo' => $curso->titulo,
            'carga_horaria_minutos' => $curso->carga_horaria_minutos,
            'capa_url' => $curso->capa_url,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resumoTurma(Turma $turma): array
    {
        return [
            'id' => $turma->id,
            'nome' => $turma->nome,
            'data_inicio' => $turma->data_inicio,
            'data_fim' => $turma->data_fim,
            'inscricoes_inicio' => $turma->inscricoes_inicio,
            'inscricoes_fim' => $turma->inscricoes_fim,
            'modalidade' => $turma->modalidade,
            'local' => $turma->local,
            // Vagas restantes, nunca o total (design D7/tarefa 3.3): a capacidade da turma é
            // informação de gestão interna, não da oferta pública.
            'vagas_restantes' => max(0, $turma->vagas - $this->inscricoes->vagasOcupadas($turma)),
        ];
    }
}
