<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\TipoCampoInscricao;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;

/**
 * Campos extras do formulário de inscrição de um curso (design D9). Campo com resposta não é
 * excluído (`restrictOnDelete` em `cursos_inscricao_respostas`), só desativado — mesmo desenho
 * de `QuestaoService::alterarAtivacao` na Fase 2.
 */
final class CampoInscricaoService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param array<string, mixed> $dados rotulo, tipo, obrigatorio, opcoes, ordem
     */
    public function criar(Curso $curso, array $dados): CampoInscricao
    {
        $tipo = TipoCampoInscricao::from((string) ($dados['tipo'] ?? ''));
        $opcoes = $this->validarOpcoes($tipo, $dados['opcoes'] ?? null);

        return DB::transaction(function () use ($curso, $dados, $tipo, $opcoes): CampoInscricao {
            // refresh(): sem isso o model em memória não carrega colunas com padrão no banco que
            // não vieram explícitas acima (ativo) — mesmo achado da 3.1 em TurmaService::criar.
            $campo = $curso->camposInscricao()->create([
                'rotulo' => $dados['rotulo'],
                'tipo' => $tipo->value,
                'obrigatorio' => (bool) ($dados['obrigatorio'] ?? false),
                'opcoes' => $opcoes,
                'ordem' => $dados['ordem'] ?? ((int) $curso->camposInscricao()->max('ordem')) + 1,
            ])->refresh();
            $this->audit->record('cursos', 'campo_inscricao.criado', "CampoInscricao #{$campo->id}", null, $campo->toArray());

            return $campo;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(CampoInscricao $campo, array $dados): CampoInscricao
    {
        $tipo = TipoCampoInscricao::from((string) ($dados['tipo'] ?? $campo->tipo));
        $temOpcoes = array_key_exists('opcoes', $dados);
        $opcoes = $this->validarOpcoes($tipo, $temOpcoes ? $dados['opcoes'] : $campo->opcoes);

        return DB::transaction(function () use ($campo, $dados, $tipo, $opcoes): CampoInscricao {
            $antes = $campo->toArray();
            $campo->update([
                ...$dados,
                'tipo' => $tipo->value,
                'opcoes' => $opcoes,
            ]);
            $this->audit->record('cursos', 'campo_inscricao.atualizado', "CampoInscricao #{$campo->id}", $antes, $campo->toArray());

            return $campo;
        });
    }

    public function alterarAtivacao(CampoInscricao $campo, bool $ativo): CampoInscricao
    {
        return DB::transaction(function () use ($campo, $ativo): CampoInscricao {
            $antes = ['ativo' => $campo->ativo];
            $campo->update(['ativo' => $ativo]);
            $this->audit->record('cursos', $ativo ? 'campo_inscricao.ativado' : 'campo_inscricao.desativado', "CampoInscricao #{$campo->id}", $antes, ['ativo' => $ativo]);

            return $campo;
        });
    }

    public function excluir(CampoInscricao $campo): void
    {
        if ($campo->respostas()->exists()) {
            throw new DomainException('Este campo já tem respostas e não pode ser excluído. Desative-o em vez de excluir.');
        }

        DB::transaction(function () use ($campo): void {
            $antes = $campo->toArray();
            $campo->delete();
            $this->audit->record('cursos', 'campo_inscricao.excluido', "CampoInscricao #{$antes['id']}", $antes, null);
        });
    }

    /**
     * @param list<int> $ids todos os campos do curso, na nova ordem
     * @return Collection<int, CampoInscricao>
     */
    public function reordenar(Curso $curso, array $ids): Collection
    {
        $existentes = $curso->camposInscricao()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $novos = array_map('intval', $ids);

        if (count($novos) !== count(array_unique($novos)) || array_diff($existentes, $novos) !== [] || array_diff($novos, $existentes) !== []) {
            throw new DomainException('A lista de reordenação deve conter exatamente os campos do curso, sem repetições.');
        }

        DB::transaction(function () use ($curso, $novos): void {
            foreach ($novos as $posicao => $id) {
                $curso->camposInscricao()->whereKey($id)->update(['ordem' => $posicao + 1]);
            }
            $this->audit->record('cursos', 'campo_inscricao.reordenados', "Curso #{$curso->id}", null, ['ordem' => $novos]);
        });

        return $curso->camposInscricao()->get();
    }

    /**
     * @param mixed $opcoes
     * @return list<string>|null
     */
    private function validarOpcoes(TipoCampoInscricao $tipo, mixed $opcoes): ?array
    {
        if (!$tipo->is(TipoCampoInscricao::Selecao)) {
            return null;
        }

        $limpas = collect(is_array($opcoes) ? $opcoes : [])
            ->map(fn ($o) => is_string($o) ? trim($o) : null)
            ->filter(fn (?string $o): bool => $o !== null && $o !== '')
            ->unique()
            ->values()
            ->all();

        if ($limpas === []) {
            throw new DomainException('Campos do tipo seleção precisam de pelo menos uma opção.');
        }

        return $limpas;
    }
}
