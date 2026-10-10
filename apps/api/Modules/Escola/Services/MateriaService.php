<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Escola\Models\Materia;
use Modules\Escola\Services\Concerns\RegistraMutacao;
use Modules\Escola\Support\LeitorCsv;
use Modules\Escola\Support\NomeNormalizado;

final class MateriaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    public function criar(string $nome): Materia
    {
        return DB::transaction(function () use ($nome): Materia {
            $this->garantirNomeLivre($nome);
            $materia = Materia::create(['nome' => $nome]);
            $this->auditar('materia', 'criada', $materia->id, null, $materia->toArray());

            return $materia;
        });
    }

    public function atualizar(Materia $materia, string $nome): Materia
    {
        return DB::transaction(function () use ($materia, $nome): Materia {
            $this->garantirNomeLivre($nome, $materia->id);
            $antes = $materia->toArray();
            $materia->update(['nome' => $nome]);
            $this->auditar('materia', 'atualizada', $materia->id, $antes, $materia->toArray());

            return $materia;
        });
    }

    /** Exclusão lógica; os vínculos com as turmas são removidos. */
    public function excluir(Materia $materia): void
    {
        DB::transaction(function () use ($materia): void {
            $antes = $materia->toArray();
            $vinculos = $materia->vinculos()->delete();
            $materia->delete();
            $this->auditar('materia', 'excluida', $materia->id, $antes, null, ['vinculos_removidos' => $vinculos]);
        });
    }

    /**
     * Importa a coluna "Nome" (formato do Exportar CSV) ou, sem ela, os nomes da primeira coluna.
     *
     * @return array{importadas: int, ignoradas: int}
     */
    public function importar(LeitorCsv $csv): array
    {
        $coluna = $csv->temColuna('NOME') ? 'NOME' : '__0';
        $resultado = ['importadas' => 0, 'ignoradas' => 0];

        DB::transaction(function () use ($csv, $coluna, &$resultado): void {
            foreach ($csv->linhas() as $linha) {
                $nome = $linha[$coluna] ?? '';
                if ($nome === '') {
                    continue;
                }
                if ($this->nomeEmUso($nome)) {
                    $resultado['ignoradas']++;
                    continue;
                }
                $materia = Materia::create(['nome' => $nome]);
                $this->auditar('materia', 'importada', $materia->id, null, $materia->toArray());
                $resultado['importadas']++;
            }
        });

        return $resultado;
    }

    /** CSV "ID;Nome" em UTF-8 com BOM (abre com acentos corretos no Excel). */
    public function exportar(): string
    {
        $linhas = ["\u{FEFF}ID;Nome"];
        foreach (Materia::query()->orderBy('nome')->get(['id', 'nome']) as $materia) {
            $linhas[] = $materia->id . ';"' . str_replace('"', '""', $materia->nome) . '"';
        }

        return implode("\r\n", $linhas) . "\r\n";
    }

    private function garantirNomeLivre(string $nome, ?int $ignorarId = null): void
    {
        if ($this->nomeEmUso($nome, $ignorarId)) {
            throw ValidationException::withMessages(['nome' => 'Esta matéria já está cadastrada.']);
        }
    }

    private function nomeEmUso(string $nome, ?int $ignorarId = null): bool
    {
        return Materia::query()
            ->where('nome_normalizado', NomeNormalizado::de($nome))
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->lockForUpdate()
            ->exists();
    }
}
