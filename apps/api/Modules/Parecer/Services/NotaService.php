<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Parecer\Models\Nota;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Notas por matéria e trimestre (notas.php): 0 a 10, só nos trimestres com nota da série. */
final class NotaService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** "7,5" → 7.5; vazio → null; fora de 0..10 ou não numérico → false. */
    public static function ler(string $valor): float|false|null
    {
        $v = trim(str_replace(',', '.', $valor));
        if ($v === '') {
            return null;
        }
        if (!is_numeric($v)) {
            return false;
        }
        $n = round((float) $v, 2);

        return $n < 0 || $n > 10 ? false : $n;
    }

    public static function formatar(?float $n): string
    {
        return $n === null ? '' : rtrim(rtrim(number_format($n, 2, ',', ''), '0'), ',');
    }

    /** @return list<int> */
    public static function exigirTrimestres(int $serie): array
    {
        $tris = Catalogo::trimestresComNota($serie);
        if ($tris === []) {
            throw new DomainException('O ' . Catalogo::SERIES[$serie] . ' não tem notas: a avaliação é feita só pelo parecer descritivo.');
        }

        return $tris;
    }

    /** @return Collection<int, Aluno> alunos da turma (ativos primeiro) */
    public function alunos(int $turmaId): Collection
    {
        return Aluno::query()->where('turma_id', $turmaId)
            ->orderByRaw("CASE WHEN situacao = 'ativo' THEN 0 ELSE 1 END")->orderByRaw('numero IS NULL')->orderBy('numero')->orderBy('nome')
            ->get(['id', 'numero', 'nome', 'cgm', 'situacao']);
    }

    /** @return array<int, array<int, float>> aluno_id => [tri => nota] */
    public function mapa(int $turmaId, string $materia): array
    {
        $mapa = [];
        foreach (Nota::query()->where('materia', $materia)->whereIn('aluno_id', Aluno::query()->where('turma_id', $turmaId)->select('id'))->get() as $n) {
            $mapa[$n->aluno_id][$n->trimestre] = (float) $n->nota;
        }

        return $mapa;
    }

    /**
     * Grava as notas e devolve quantas mudaram. Só alunos ativos da turma e trimestres com nota.
     *
     * @param array<int|string, array<int|string, float|null>> $entrada aluno_id => [tri => nota|null (apaga)]
     */
    public function gravar(Turma $turma, int $serie, string $materia, array $entrada, User $user): int
    {
        $tris = self::exigirTrimestres($serie);

        return DB::transaction(function () use ($turma, $serie, $materia, $entrada, $user, $tris): int {
            $ativos = Aluno::query()->where('turma_id', $turma->id)->where('situacao', 'ativo')->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $atuais = $this->mapa($turma->id, $materia);
            $mud = [];
            foreach ($entrada as $alunoId => $porTri) {
                $alunoId = (int) $alunoId;
                if (!in_array($alunoId, $ativos, true)) {
                    continue;
                }
                foreach ($tris as $t) {
                    if (!array_key_exists($t, $porTri) && !array_key_exists((string) $t, $porTri)) {
                        continue;
                    }
                    $novo = $porTri[$t] ?? $porTri[(string) $t] ?? null;
                    $novo = $novo === null ? null : (float) $novo;
                    $velho = $atuais[$alunoId][$t] ?? null;
                    if ($novo === $velho) {
                        continue;
                    }
                    $novo === null
                        ? Nota::query()->where('aluno_id', $alunoId)->where('materia', $materia)->where('trimestre', $t)->delete()
                        : Nota::query()->updateOrCreate(['aluno_id' => $alunoId, 'materia' => $materia, 'trimestre' => $t], ['nota' => $novo, 'lancado_por' => $user->id]);
                    $mud[] = ['aluno_id' => $alunoId, 'trimestre' => $t, 'antes' => $velho, 'depois' => $novo];
                }
            }
            if ($mud !== []) {
                $this->auditar('notas', 'lancadas', $turma->id, sprintf('%d nota(s) de %s · %s %s', count($mud), Catalogo::MATERIAS[$materia], Catalogo::SERIES[$serie], $turma->nome), null, ['mudancas' => $mud]);
            }

            return count($mud);
        });
    }

    /**
     * Lê a planilha CSV da matéria (cgm;nome;nota_1tri…): acha o aluno pelo CGM ou pelo nome.
     * Célula vazia não apaga nota já lançada.
     *
     * @return array{entrada: array<int, array<int, float>>, erros: list<string>}
     */
    public function lerPlanilha(string $conteudo, int $turmaId, int $serie): array
    {
        $tris = self::exigirTrimestres($serie);
        $conteudo = (string) preg_replace('/^\xEF\xBB\xBF/', '', $conteudo);
        if (!mb_check_encoding($conteudo, 'UTF-8')) {
            $conteudo = mb_convert_encoding($conteudo, 'UTF-8', 'Windows-1252');
        }
        $linhas = preg_split('/\R/u', trim($conteudo)) ?: [];
        $sep = substr_count($linhas[0] ?? '', ';') >= substr_count($linhas[0] ?? '', ',') ? ';' : ',';
        $cab = array_map(fn ($c): string => mb_strtolower(trim((string) $c)), str_getcsv((string) array_shift($linhas), $sep, '"', ''));
        $col = fn (string $n): int|false => array_search($n, $cab, true);
        if ($col('nome') === false && $col('cgm') === false) {
            throw new DomainException('A planilha precisa das colunas "cgm" ou "nome". Baixe a planilha da matéria e preencha nela.');
        }
        $porCgm = $porNome = [];
        foreach ($this->alunos($turmaId) as $a) {
            if ($a->cgm) {
                $porCgm[(string) $a->cgm] = $a->id;
            }
            $porNome[mb_strtoupper($a->nome)] = $a->id;
        }
        $entrada = [];
        $erros = [];
        foreach ($linhas as $i => $linha) {
            if (trim(str_replace($sep, '', $linha)) === '') {
                continue;
            }
            $v = str_getcsv($linha, $sep, '"', '');
            $cgm = $col('cgm') !== false ? (string) preg_replace('/\s+/', '', (string) ($v[$col('cgm')] ?? '')) : '';
            $nome = $col('nome') !== false ? mb_strtoupper(trim((string) preg_replace('/\s+/u', ' ', (string) ($v[$col('nome')] ?? '')))) : '';
            $id = ($cgm !== '' ? ($porCgm[$cgm] ?? null) : null) ?? ($porNome[$nome] ?? null);
            if ($id === null) {
                $erros[] = 'linha ' . ($i + 2) . ': aluno não encontrado na turma';
                continue;
            }
            foreach ($tris as $t) {
                $k = $col("nota_{$t}tri");
                if ($k === false) {
                    continue;
                }
                $n = self::ler((string) ($v[$k] ?? ''));
                if ($n === false) {
                    $erros[] = 'linha ' . ($i + 2) . ": nota do {$t}º tri inválida";
                    continue;
                }
                if ($n !== null) {
                    $entrada[$id][$t] = $n;
                }
            }
        }

        return ['entrada' => $entrada, 'erros' => array_values(array_unique($erros))];
    }

    /** Planilha da matéria já com os alunos ativos e as notas lançadas (modelo e exportação). */
    public function planilha(int $turmaId, int $serie, string $materia): string
    {
        $tris = self::exigirTrimestres($serie);
        $notas = $this->mapa($turmaId, $materia);
        $out = fopen('php://temp', 'r+');
        fputcsv($out, ['cgm', 'nome', ...array_map(fn ($t): string => "nota_{$t}tri", $tris)], ';', '"', '');
        foreach ($this->alunos($turmaId) as $a) {
            if ($a->situacao !== 'ativo') {
                continue;
            }
            fputcsv($out, [$a->cgm, $a->nome, ...array_map(fn ($t): string => self::formatar($notas[$a->id][$t] ?? null), $tris)], ';', '"', '');
        }
        rewind($out);

        return "\xEF\xBB\xBF" . stream_get_contents($out);
    }
}
