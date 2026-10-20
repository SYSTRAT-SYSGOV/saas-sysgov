<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\RegraNegocioException;

/**
 * Mescla duas pessoas físicas duplicadas: a pessoa de origem (com documento pendente) é absorvida pela
 * pessoa de destino. Todas as referências a ela — em qualquer tabela com chave estrangeira para `pessoas`,
 * de qualquer módulo — são reapontadas para o destino, o destino só tem campos vazios completados e a
 * origem é excluída logicamente. Tudo em uma transação (unificar-cadastro-pessoas, D3).
 */
final class MesclagemPessoaService
{
    /** Campos civis que a origem pode completar no destino quando este os tem vazios. */
    private const CAMPOS_COMPLETAVEIS = [
        'nome_social', 'data_nascimento', 'sexo', 'nome_mae', 'nome_pai', 'estado_civil',
        'nacionalidade', 'naturalidade', 'nis', 'responsavel_id',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    public function mesclar(Pessoa $origem, Pessoa $destino): Pessoa
    {
        $this->validar($origem, $destino);

        return DB::transaction(function () use ($origem, $destino): Pessoa {
            $completados = $this->completarDestino($origem, $destino);
            $reapontados = $this->reapontarReferencias($origem->id, $destino->id);

            $origem->delete();

            $this->audit->record('pessoas', 'pessoa.mesclada', "Pessoa #{$destino->id}", null, [
                'origem_id' => $origem->id,
                'destino_id' => $destino->id,
                'campos_completados' => $completados,
                'referencias_reapontadas' => $reapontados,
            ]);

            return $destino->refresh();
        });
    }

    private function validar(Pessoa $origem, Pessoa $destino): void
    {
        if ($origem->id === $destino->id) {
            throw new RegraNegocioException('mesclagem_invalida', 'Não é possível mesclar uma pessoa com ela mesma.');
        }
        if ($origem->tipo !== 'fisica' || $destino->tipo !== 'fisica') {
            throw new RegraNegocioException('mesclagem_invalida', 'Só é possível mesclar pessoas físicas.');
        }
        if ($origem->tenant_id !== $destino->tenant_id) {
            throw new RegraNegocioException('mesclagem_invalida', 'As pessoas precisam ser do mesmo órgão.');
        }
        if (! $origem->documento_pendente) {
            throw new RegraNegocioException(
                'mesclagem_invalida',
                'A pessoa absorvida precisa estar com o documento pendente; pessoas com CPF distintos não são mescladas.'
            );
        }
        if ($origem->usuario()->exists() && $destino->usuario()->exists()) {
            throw new RegraNegocioException('mesclagem_conflito', 'As duas pessoas têm usuário de acesso; resolva o acesso antes de mesclar.');
        }
    }

    /**
     * @return list<string> campos do destino que estavam vazios e foram completados
     */
    private function completarDestino(Pessoa $origem, Pessoa $destino): array
    {
        $completados = [];
        foreach (self::CAMPOS_COMPLETAVEIS as $campo) {
            $atual = $destino->getAttribute($campo);
            $novo = $origem->getAttribute($campo);
            if (($atual === null || $atual === '') && $novo !== null && $novo !== '') {
                $destino->setAttribute($campo, $novo);
                $completados[] = $campo;
            }
        }
        if ($destino->isDirty()) {
            $destino->save();
        }

        return $completados;
    }

    /**
     * @return array<string, int> quantidade de registros reapontados por "tabela.coluna"
     */
    private function reapontarReferencias(int $deId, int $paraId): array
    {
        $reapontados = [];

        try {
            foreach (Schema::getTables() as $tabela) {
                $nome = (string) $tabela['name'];
                foreach (Schema::getForeignKeys($nome) as $fk) {
                    if (($fk['foreign_table'] ?? null) !== 'pessoas' || count($fk['columns']) !== 1) {
                        continue;
                    }
                    $coluna = (string) $fk['columns'][0];
                    $total = DB::table($nome)->where($coluna, $deId)->update([$coluna => $paraId]);
                    if ($total > 0) {
                        $reapontados["{$nome}.{$coluna}"] = $total;
                    }
                }
            }
        } catch (QueryException $e) {
            throw new RegraNegocioException('mesclagem_conflito', 'Não foi possível reapontar as referências: há registros que conflitam entre as duas pessoas.', ['detalhe' => $e->getCode()]);
        }

        return $reapontados;
    }
}
