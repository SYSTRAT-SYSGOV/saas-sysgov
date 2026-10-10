<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Services\Concerns\RegistraMutacao;
use Modules\Escola\Support\NomeNormalizado;

final class CategoriaOcorrenciaService
{
    use RegistraMutacao;

    /** Categorias criadas para o tenant que nunca teve categorias (design D10). */
    public const PADROES = [
        'Elogio / Destaque' => '#f59e0b',
        'Falta' => '#4ccce6',
        'Falta de Material' => '#64748b',
        'Indisciplina' => '#ef4444',
        'Outros' => '#94a3b8',
        'Pedagógico / Notas' => '#3b82f6',
        'Saúde / Acidente' => '#10b981',
        'Uniforme' => '#b626c9',
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @return Collection<int, CategoriaOcorrencia> */
    public function listar(): Collection
    {
        $this->garantirPadroes();

        return CategoriaOcorrencia::query()->orderBy('nome')->get();
    }

    public function garantirPadroes(): void
    {
        if (CategoriaOcorrencia::withTrashed()->exists()) {
            return;
        }
        DB::transaction(function (): void {
            foreach (self::PADROES as $nome => $cor) {
                CategoriaOcorrencia::create(['nome' => $nome, 'cor' => $cor]);
            }
        });
    }

    /** @param array{nome: string, cor: string} $dados */
    public function criar(array $dados): CategoriaOcorrencia
    {
        return DB::transaction(function () use ($dados): CategoriaOcorrencia {
            $this->garantirNomeLivre($dados['nome']);
            $categoria = CategoriaOcorrencia::create($dados);
            $this->auditar('categoria', 'criada', $categoria->id, null, $categoria->toArray());

            return $categoria;
        });
    }

    /** @param array{nome?: string, cor?: string} $dados */
    public function atualizar(CategoriaOcorrencia $categoria, array $dados): CategoriaOcorrencia
    {
        return DB::transaction(function () use ($categoria, $dados): CategoriaOcorrencia {
            if (isset($dados['nome'])) {
                $this->garantirNomeLivre($dados['nome'], $categoria->id);
            }
            $antes = $categoria->toArray();
            $categoria->update($dados);
            $this->auditar('categoria', 'atualizada', $categoria->id, $antes, $categoria->toArray());

            return $categoria;
        });
    }

    /** Exclusão lógica: ocorrências já registradas continuam apontando para a categoria. */
    public function excluir(CategoriaOcorrencia $categoria): void
    {
        DB::transaction(function () use ($categoria): void {
            $antes = $categoria->toArray();
            $categoria->delete();
            $this->auditar('categoria', 'excluida', $categoria->id, $antes, null);
        });
    }

    private function garantirNomeLivre(string $nome, ?int $ignorarId = null): void
    {
        $emUso = CategoriaOcorrencia::query()
            ->where('nome_normalizado', NomeNormalizado::de($nome))
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
        if ($emUso) {
            throw ValidationException::withMessages(['nome' => 'Já existe uma categoria com este nome.']);
        }
    }
}
