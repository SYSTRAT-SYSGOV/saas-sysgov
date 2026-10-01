<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\HtmlSanitizer;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Enums\TipoCurso;
use Modules\Cursos\Models\Curso;

final class CursoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly HtmlSanitizer $sanitizer,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * @param array{tipo?: string, titulo: string, slug?: string|null, descricao?: string|null, texto_publico?: string|null, carga_horaria_minutos: int, frequencia_minima?: int, nota_minima?: float|int|string|null, modelo_certificado_id?: int|null} $dados
     */
    public function criar(array $dados, User $user): Curso
    {
        $this->garantirEventoSemAvaliacao(TipoCurso::from($dados['tipo'] ?? TipoCurso::Curso->value), $dados['nota_minima'] ?? null);

        return DB::transaction(function () use ($dados, $user): Curso {
            $slug = $dados['slug'] ?? null;
            $slug = $slug !== null && $slug !== '' ? $slug : $this->gerarSlugUnico($dados['titulo']);

            $curso = Curso::create([
                ...$dados,
                'tipo' => $dados['tipo'] ?? TipoCurso::Curso->value,
                'slug' => $slug,
                'texto_publico' => $this->sanitizarTextoPublico($dados['texto_publico'] ?? null),
                'status' => StatusCurso::Rascunho->value,
                'criado_por' => $user->id,
            ])->refresh();

            $this->audit->record('cursos', 'curso.criado', "Curso #{$curso->id}", null, $curso->toArray());
            $this->outbox->publish('cursos.CursoCriado', ['id' => $curso->id, 'tipo' => $curso->tipo]);

            return $curso;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(Curso $curso, array $dados): Curso
    {
        if ($curso->statusEnum()->is(StatusCurso::Encerrado)) {
            throw new DomainException('Curso encerrado não pode ser alterado.');
        }

        if (($dados['tipo'] ?? null) === TipoCurso::Evento->value && $this->turmasNaoCanceladas($curso) > 1) {
            throw new DomainException('Este curso tem mais de uma turma e não pode virar evento — eventos têm turma única.');
        }

        $tipo = TipoCurso::from($dados['tipo'] ?? $curso->tipo);
        $notaMinima = array_key_exists('nota_minima', $dados) ? $dados['nota_minima'] : $curso->nota_minima;
        $this->garantirEventoSemAvaliacao($tipo, $notaMinima);
        if ($tipo === TipoCurso::Evento && $curso->avaliacoes()->exists()) {
            throw new DomainException('Este curso tem avaliações e não pode virar evento — eventos não têm avaliação.');
        }

        if (array_key_exists('texto_publico', $dados)) {
            $dados['texto_publico'] = $this->sanitizarTextoPublico($dados['texto_publico']);
        }

        if (array_key_exists('slug', $dados) && ($dados['slug'] === null || $dados['slug'] === '')) {
            // Achado da revisão do PR (tarefa 7.4): `criar()` já gerava o slug a partir do
            // título quando vinha vazio, mas limpar o slug na EDIÇÃO (o mesmo campo do formulário
            // aceita isso, "deixe em branco pra gerar do título") gravava NULL de verdade — a
            // página pública do curso parava de resolver por slug até alguém digitar um na mão.
            $dados['slug'] = $this->gerarSlugUnico($dados['titulo'] ?? $curso->titulo, $curso->id);
        }

        return DB::transaction(function () use ($curso, $dados): Curso {
            $antes = $curso->toArray();
            $curso->update($dados);

            $this->audit->record('cursos', 'curso.atualizado', "Curso #{$curso->id}", $antes, $curso->toArray());

            return $curso;
        });
    }

    public function alterarStatus(Curso $curso, StatusCurso $novo): Curso
    {
        if (!$curso->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida de "%s" para "%s".', $curso->statusEnum()->label(), $novo->label()));
        }

        return DB::transaction(function () use ($curso, $novo): Curso {
            $antes = $curso->status;
            $curso->update(['status' => $novo->value]);

            $this->audit->record('cursos', 'curso.status_alterado', "Curso #{$curso->id}", ['status' => $antes], ['status' => $novo->value]);
            $this->outbox->publish('cursos.CursoStatusAlterado', ['id' => $curso->id, 'status' => $novo->value]);

            return $curso;
        });
    }

    public function excluir(Curso $curso): void
    {
        if ($curso->inscricoes()->exists()) {
            throw new DomainException('Este curso tem inscrições e não pode ser excluído. Encerre o curso em vez de excluí-lo.');
        }

        DB::transaction(function () use ($curso): void {
            $antes = $curso->toArray();
            $capa = $curso->capa_path;
            $curso->delete();

            if ($capa !== null) {
                Storage::disk('public')->delete($capa);
            }

            $this->audit->record('cursos', 'curso.excluido', "Curso #{$antes['id']}", $antes, null);
            $this->outbox->publish('cursos.CursoExcluido', ['id' => $antes['id']]);
        });
    }

    public function definirCapa(Curso $curso, UploadedFile $arquivo): Curso
    {
        $antes = $curso->capa_path;
        $caminho = $arquivo->storeAs(
            "cursos/{$curso->tenant_id}/capas",
            "curso-{$curso->id}-" . now()->format('YmdHis') . '.' . strtolower($arquivo->getClientOriginalExtension()),
            'public',
        );

        $curso->update(['capa_path' => $caminho]);
        if ($antes !== null && $antes !== $caminho) {
            Storage::disk('public')->delete($antes);
        }

        $this->audit->record('cursos', 'curso.capa_definida', "Curso #{$curso->id}", ['capa_path' => $antes], ['capa_path' => $caminho]);

        return $curso;
    }

    public function removerCapa(Curso $curso): Curso
    {
        $antes = $curso->capa_path;
        if ($antes === null) {
            return $curso;
        }

        $curso->update(['capa_path' => null]);
        Storage::disk('public')->delete($antes);
        $this->audit->record('cursos', 'curso.capa_removida', "Curso #{$curso->id}", ['capa_path' => $antes], ['capa_path' => null]);

        return $curso;
    }

    /** Evento não tem avaliação, então não aceita nota mínima (spec: Evento é um curso de turma única). */
    private function garantirEventoSemAvaliacao(TipoCurso $tipo, mixed $notaMinima): void
    {
        if ($tipo === TipoCurso::Evento && $notaMinima !== null) {
            throw new DomainException('Eventos não têm avaliação e não aceitam nota mínima.');
        }
    }

    private function turmasNaoCanceladas(Curso $curso): int
    {
        return $curso->turmas()->where('status', '!=', StatusTurma::Cancelada->value)->count();
    }

    /** Slug gerado do título (design D11), único por tenant — sufixo -2, -3... em colisão. */
    private function gerarSlugUnico(string $titulo, ?int $excetoId = null): string
    {
        $base = Str::slug($titulo);
        if ($base === '') {
            $base = 'curso';
        }

        $slug = $base;
        $sufixo = 2;
        while (
            Curso::query()->where('tenant_id', $this->tenantContext->id())->where('slug', $slug)
                ->when($excetoId !== null, fn ($q) => $q->where('id', '!=', $excetoId))
                ->exists()
        ) {
            $slug = "{$base}-{$sufixo}";
            $sufixo++;
        }

        return $slug;
    }

    private function sanitizarTextoPublico(?string $texto): ?string
    {
        if ($texto === null) {
            return null;
        }

        $limpo = $this->sanitizer->sanitize($texto);

        return $limpo !== '' ? $limpo : null;
    }
}
