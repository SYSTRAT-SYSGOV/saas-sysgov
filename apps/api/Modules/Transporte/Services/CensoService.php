<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Collection;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Transporte\Censo\Campo;
use Modules\Transporte\Censo\Leiaute;
use Modules\Transporte\Censo\Linha;
use Modules\Transporte\Models\Alocacao;
use Modules\Transporte\Support\Csv;

/**
 * Registro 60 (transporte escolar do Censo). Uma linha por alocação ativa do ano letivo (design D25). O arquivo é
 * montado sob demanda e nunca é guardado no servidor (D32).
 */
final class CensoService
{
    public const TIPOS_PENDENCIA = ['sem_alocacao_ativa', 'rota_sem_veiculo', 'rural_sem_declaracao', 'veiculo_nao_adaptado', 'sem_codigo_inep', 'campo_sem_dado'];

    public function __construct(private readonly AuditLogger $audit) {}

    /** @return Collection<int, Linha> */
    public function linhas(int $ano): Collection
    {
        $alocacoes = Alocacao::query()->with(['aluno.pessoa', 'aluno.turma.turno', 'parada', 'rota.veiculo'])
            ->whereNull('data_fim')->whereHas('rota', fn ($q) => $q->where('ano_letivo', $ano))->get();
        $escolas = Escola::query()->whereIn('id', $alocacoes->map(fn (Alocacao $a): ?int => $a->aluno?->escola_id)->filter()->unique())->get()->keyBy('id');

        return $alocacoes->filter(fn (Alocacao $a): bool => $a->aluno instanceof Aluno)
            ->map(fn (Alocacao $a): Linha => new Linha($a, $a->aluno, $escolas[$a->aluno->escola_id]->nome ?? null, $escolas[$a->aluno->escola_id]->inep ?? null, $ano))
            ->sortBy(fn (Linha $l): string => ($l->escolaNome ?? '') . '|' . $l->aluno->nome)->values();
    }

    /**
     * Pré-validação do ano. Não bloqueia a geração (D27): `approved` só diz que não há pendência.
     *
     * @param list<string> $campos chaves já resolvidas (obrigatórios inclusos)
     * @return array<string, mixed>
     */
    public function preValidar(int $ano, Leiaute $leiaute, array $campos): array
    {
        $linhas = $this->linhas($ano);
        $pendencias = [];
        $avisos = [];

        foreach ($linhas as $l) {
            $a = $l->alocacao;
            $base = ['aluno_id' => $l->aluno->id, 'aluno' => $l->aluno->nome, 'rota' => $a->rota?->nome];
            if ($a->rota?->veiculo === null) {
                $pendencias[] = ['tipo' => 'rota_sem_veiculo', ...$base];
            }
            if ($a->rota?->tipo_rede === 'rural' && !$a->usa_transporte_rural) {
                $pendencias[] = ['tipo' => 'rural_sem_declaracao', ...$base];
            }
            if ($a->necessidade_especial && $a->rota?->veiculo !== null && !$a->rota->veiculo->acessivel) {
                $pendencias[] = ['tipo' => 'veiculo_nao_adaptado', ...$base];
            }
            foreach ($leiaute->campos() as $campo) {
                if (in_array($campo->chave, $campos, true) && in_array($campo->chave, $leiaute->camposDeCodigoInep(), true) && $this->vazio(($campo->valor)($l))) {
                    $pendencias[] = ['tipo' => 'sem_codigo_inep', ...$base, 'campo' => $campo->chave];
                }
            }
            foreach ($a->avisos() as $aviso) {
                $avisos[] = ['tipo' => $aviso, ...$base];
            }
        }

        foreach ($this->semAlocacaoAtiva($ano) as $aluno) {
            $pendencias[] = ['tipo' => 'sem_alocacao_ativa', 'aluno_id' => $aluno->id, 'aluno' => $aluno->nome, 'rota' => null];
        }

        $semDado = [];
        if ($linhas->isNotEmpty()) {
            foreach ($leiaute->campos() as $campo) {
                $ignorado = in_array($campo->chave, $leiaute->camposDeCodigoInep(), true) || $campo->chave === 'transporte_publico';
                if (in_array($campo->chave, $campos, true) && !$ignorado && $linhas->every(fn (Linha $l): bool => $this->vazio(($campo->valor)($l)))) {
                    $semDado[] = ['chave' => $campo->chave, 'rotulo' => $campo->rotulo];
                    $pendencias[] = ['tipo' => 'campo_sem_dado', 'aluno_id' => null, 'aluno' => null, 'rota' => null, 'campo' => $campo->chave, 'rotulo' => $campo->rotulo];
                }
            }
        }

        $resumo = array_fill_keys(self::TIPOS_PENDENCIA, 0);
        foreach ($pendencias as $p) {
            $resumo[$p['tipo']]++;
        }

        return [
            'ano_letivo' => $ano,
            'leiaute' => $leiaute->chave(),
            'approved' => $pendencias === [],
            'total_linhas' => $linhas->count(),
            'resumo' => $resumo,
            'pendencias' => $pendencias,
            'avisos' => $avisos,
            'campos_sem_dado' => $semDado,
        ];
    }

    /**
     * Arquivo do leiaute: todas as colunas do catálogo, na ordem; o campo não escolhido sai vazio na posição.
     *
     * @param list<string> $campos
     */
    public function gerarArquivo(int $ano, Leiaute $leiaute, array $campos): string
    {
        $catalogo = $leiaute->campos();
        $saida = Csv::BOM . Csv::linha(array_map(fn (Campo $c): string => $c->chave, $catalogo));
        foreach ($this->linhas($ano) as $linha) {
            $saida .= Csv::linha(array_map(fn (Campo $c): string|int|null => in_array($c->chave, $campos, true) ? ($c->valor)($linha) : null, $catalogo));
        }

        return $saida;
    }

    /**
     * CSV de conferência (D31): só os campos escolhidos, com rótulos, sem os que o leiaute marca como fora da conferência
     * (CPF). Nunca tem endereço nem a observação da necessidade especial: não existem no catálogo.
     *
     * @param list<string> $campos
     */
    public function gerarConferencia(int $ano, Leiaute $leiaute, array $campos): string
    {
        $colunas = array_values(array_filter($leiaute->campos(), fn (Campo $c): bool => $c->confere && in_array($c->chave, $campos, true)));
        $saida = Csv::BOM . Csv::linha(array_map(fn (Campo $c): string => $c->rotulo, $colunas));
        foreach ($this->linhas($ano) as $linha) {
            $saida .= Csv::linha(array_map(fn (Campo $c): string|int|null => ($c->valor)($linha), $colunas));
        }

        return $saida;
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function auditar(string $acao, int $ano, Leiaute $leiaute, array $dados): void
    {
        $this->audit->record('transporte', $acao, "censo:{$ano}", null, ['ano_letivo' => $ano, 'leiaute' => $leiaute->chave(), ...$dados]);
    }

    /**
     * Alunos que tiveram alocação em rotas do ano e hoje não têm nenhuma ativa (o cadastro escolar não diz quem deveria usar transporte).
     *
     * @return Collection<int, Aluno>
     */
    private function semAlocacaoAtiva(int $ano): Collection
    {
        $doAno = Alocacao::query()->whereHas('rota', fn ($q) => $q->where('ano_letivo', $ano));
        $comAtiva = (clone $doAno)->whereNull('data_fim')->pluck('aluno_id');
        $ids = (clone $doAno)->pluck('aluno_id')->unique()->diff($comAtiva);

        return Aluno::query()->withoutGlobalScope('escola')->withTrashed()->whereIn('id', $ids)->orderBy('nome')->get();
    }

    private function vazio(string|int|null $valor): bool
    {
        return $valor === null || $valor === '';
    }
}
