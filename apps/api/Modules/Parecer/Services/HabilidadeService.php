<?php

declare(strict_types=1);

namespace Modules\Parecer\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\Habilidade;
use Modules\Parecer\Services\Concerns\RegistraMutacao;
use Modules\Parecer\Support\Catalogo;

/** Conteúdos (habilidades) por série e matéria — mesmas ações de conteudos.php. */
final class HabilidadeService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** Carga inicial da lista de referência (parecer.docx) quando o tenant ainda não tem habilidades. */
    public function garantirPadrao(): void
    {
        if (Habilidade::query()->exists()) {
            return;
        }
        DB::transaction(function (): void {
            if (Habilidade::query()->lockForUpdate()->exists()) {
                return;
            }
            $mapa = array_flip(array_map('mb_strtoupper', Catalogo::MATERIAS));
            /** @var array<string, array<string, list<string>>> $dados */
            $dados = json_decode((string) file_get_contents(__DIR__ . '/../Database/dados/habilidades.json'), true);
            foreach ($dados as $serie => $materias) {
                foreach ($materias as $nomeMateria => $lista) {
                    foreach ($lista as $i => $descricao) {
                        Habilidade::create(['serie' => (int) $serie, 'materia' => $mapa[$nomeMateria], 'ordem' => $i + 1, 'descricao' => $descricao, 'trimestres' => '123', 'ativo' => true]);
                    }
                }
            }
        });
    }

    /**
     * "1","3" → "13"; vazio = erro.
     *
     * @param list<int|string> $tris
     */
    public static function trimestres(array $tris): string
    {
        $t = implode('', array_values(array_intersect(['1', '2', '3'], array_map('strval', $tris))));
        if ($t === '') {
            throw new DomainException('Marque pelo menos um trimestre em que a habilidade será trabalhada.');
        }

        return $t;
    }

    /** @param list<int|string> $tris */
    public function criar(int $serie, string $materia, string $descricao, ?string $codigo, array $tris): Habilidade
    {
        $t = self::trimestres($tris);

        return DB::transaction(function () use ($serie, $materia, $descricao, $codigo, $t): Habilidade {
            $ordem = (int) Habilidade::query()->where('serie', $serie)->where('materia', $materia)->max('ordem') + 1;
            $h = Habilidade::create(['serie' => $serie, 'materia' => $materia, 'ordem' => $ordem, 'descricao' => $descricao, 'codigo_bncc' => $codigo, 'trimestres' => $t, 'ativo' => true]);
            $this->auditar('habilidade', 'criada', $h->id, $this->rotulo($h) . ': ' . $descricao, null, ['trimestres' => $t, 'codigo_bncc' => $codigo]);

            return $h;
        });
    }

    /** @param list<int|string> $tris */
    public function salvar(Habilidade $h, string $descricao, ?string $codigo, array $tris): Habilidade
    {
        $t = self::trimestres($tris);

        return DB::transaction(function () use ($h, $descricao, $codigo, $t): Habilidade {
            $antes = $h->only(['descricao', 'codigo_bncc', 'trimestres']);
            $h->update(['descricao' => $descricao, 'codigo_bncc' => $codigo, 'trimestres' => $t]);
            $this->auditar('habilidade', 'editada', $h->id, $this->rotulo($h) . ': ' . $descricao, $antes, $h->only(['descricao', 'codigo_bncc', 'trimestres']));

            return $h;
        });
    }

    /**
     * Grava de uma vez os trimestres marcados na tabela. Habilidade sem nenhum trimestre não é alterada.
     *
     * @param array<int|string, list<int|string>> $marcados habilidade_id => trimestres
     * @return array{alteradas: int, vazias: int}
     */
    public function salvarTrimestres(int $serie, string $materia, array $marcados): array
    {
        return DB::transaction(function () use ($serie, $materia, $marcados): array {
            $alteradas = $vazias = 0;
            $trocas = [];
            $habs = Habilidade::query()->where('serie', $serie)->where('materia', $materia)->whereIn('id', array_map('intval', array_keys($marcados)))->get()->keyBy('id');
            foreach ($marcados as $id => $tris) {
                $t = implode('', array_values(array_intersect(['1', '2', '3'], array_map('strval', $tris))));
                $h = $habs[(int) $id] ?? null;
                if ($h === null) {
                    continue;
                }
                if ($t === '') {
                    $vazias++;
                    continue;
                }
                if ($h->trimestres !== $t) {
                    $trocas[] = ['habilidade_id' => $h->id, 'habilidade' => mb_substr($h->descricao, 0, 120), 'antes' => $h->trimestres, 'depois' => $t];
                    $h->update(['trimestres' => $t]);
                    $alteradas++;
                }
            }
            if ($trocas !== []) {
                $this->auditar('habilidade', 'trimestres', null, count($trocas) . ' habilidade(s) com trimestres alterados · ' . Catalogo::MATERIAS[$materia] . ' · ' . Catalogo::SERIES[$serie], null, ['mudancas' => $trocas]);
            }

            return ['alteradas' => $alteradas, 'vazias' => $vazias];
        });
    }

    public function alternarAtivo(Habilidade $h): Habilidade
    {
        return DB::transaction(function () use ($h): Habilidade {
            $h->update(['ativo' => !$h->ativo]);
            $this->auditar('habilidade', $h->ativo ? 'ativada' : 'desativada', $h->id, $this->rotulo($h) . ': ' . $h->descricao);

            return $h;
        });
    }

    public function excluir(Habilidade $h): void
    {
        if (Avaliacao::query()->withoutGlobalScope('escola')->where('habilidade_id', $h->id)->exists()) {
            throw new DomainException('Esta habilidade já tem avaliações lançadas: desative em vez de excluir.');
        }
        DB::transaction(function () use ($h): void {
            $registro = $h->toArray();
            $h->delete();
            $this->auditar('habilidade', 'excluida', $h->id, $this->rotulo($h) . ': ' . $h->descricao, $registro);
        });
    }

    public function mover(Habilidade $h, string $direcao): void
    {
        DB::transaction(function () use ($h, $direcao): void {
            $lista = Habilidade::query()->where('serie', $h->serie)->where('materia', $h->materia)->orderBy('ordem')->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $i = array_search($h->id, $lista, true);
            $j = $direcao === 'subir' ? $i - 1 : $i + 1;
            if ($i !== false && isset($lista[$j])) {
                [$lista[$i], $lista[$j]] = [$lista[$j], $lista[$i]];
            }
            foreach ($lista as $pos => $id) {
                Habilidade::query()->whereKey($id)->update(['ordem' => $pos + 1]);
            }
        });
    }

    public function copiar(int $origem, int $serie, string $materia): int
    {
        if ($origem === $serie || !isset(Catalogo::SERIES[$origem])) {
            throw new DomainException('Escolha outra série de origem.');
        }

        return DB::transaction(function () use ($origem, $serie, $materia): int {
            $ordem = (int) Habilidade::query()->where('serie', $serie)->where('materia', $materia)->max('ordem');
            $n = 0;
            foreach (Habilidade::query()->where('serie', $origem)->where('materia', $materia)->where('ativo', true)->orderBy('ordem')->get() as $h) {
                Habilidade::create(['serie' => $serie, 'materia' => $materia, 'ordem' => ++$ordem, 'descricao' => $h->descricao, 'codigo_bncc' => $h->codigo_bncc, 'trimestres' => $h->trimestres, 'ativo' => true]);
                $n++;
            }
            $this->auditar('habilidade', 'copiadas', null, Catalogo::MATERIAS[$materia] . ': habilidades copiadas do ' . Catalogo::SERIES[$origem] . ' para o ' . Catalogo::SERIES[$serie], null, ['quantidade' => $n]);

            return $n;
        });
    }

    /**
     * Adiciona as habilidades oficiais escolhidas (já buscadas de novo no servidor), em todos os trimestres.
     *
     * @param array<string, array{codigo: string, descricao: string}> $oficiais por código
     * @param list<string> $codigos
     */
    public function adicionarDaBncc(int $serie, string $materia, array $oficiais, array $codigos): int
    {
        return DB::transaction(function () use ($serie, $materia, $oficiais, $codigos): int {
            $ja = array_flip(array_filter(Habilidade::query()->where('serie', $serie)->where('materia', $materia)->pluck('codigo_bncc')->all()));
            $ordem = (int) Habilidade::query()->where('serie', $serie)->where('materia', $materia)->max('ordem');
            $add = [];
            foreach ($codigos as $cod) {
                $cod = strtoupper($cod);
                if (!isset($oficiais[$cod]) || isset($ja[$cod])) {
                    continue;
                }
                Habilidade::create(['serie' => $serie, 'materia' => $materia, 'ordem' => ++$ordem, 'descricao' => $oficiais[$cod]['descricao'], 'codigo_bncc' => $cod, 'trimestres' => '123', 'ativo' => true]);
                $add[] = $cod;
                $ja[$cod] = true;
            }
            if ($add !== []) {
                $this->auditar('habilidade', 'importadas', null, count($add) . ' habilidade(s) da BNCC adicionada(s) · ' . Catalogo::MATERIAS[$materia] . ' · ' . Catalogo::SERIES[$serie], null, ['codigos' => $add]);
            }

            return count($add);
        });
    }

    private function rotulo(Habilidade $h): string
    {
        return Catalogo::MATERIAS[$h->materia] . ' · ' . Catalogo::SERIES[$h->serie];
    }
}
