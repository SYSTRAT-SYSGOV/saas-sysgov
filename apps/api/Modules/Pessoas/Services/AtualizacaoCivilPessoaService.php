<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;

/**
 * Grava no cadastro central as alterações de dado civil feitas a partir de um módulo (unificar-cadastro-pessoas,
 * D4). Generaliza o que o Escola já fazia com o aluno: a pessoa é a fonte, então editar o dado no módulo
 * edita a pessoa. Só aceita campos civis, nunca apaga o nome e audita a origem sem gravar os valores.
 */
final class AtualizacaoCivilPessoaService
{
    /** Campos civis que um módulo pode alterar na pessoa. */
    public const CAMPOS = [
        'nome', 'nome_social', 'data_nascimento', 'nome_mae', 'nome_pai',
        'sexo', 'estado_civil', 'nacionalidade', 'naturalidade',
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param array<string, mixed> $alteracoes campos da pessoa (os que não são civis são ignorados)
     * @param string $origem módulo que editou (aparece na auditoria)
     */
    public function atualizar(Pessoa $pessoa, array $alteracoes, string $origem): Pessoa
    {
        $dados = array_intersect_key($alteracoes, array_flip(self::CAMPOS));
        if (array_key_exists('nome', $dados) && trim((string) $dados['nome']) === '') {
            unset($dados['nome']); // `nome` é obrigatório na pessoa: nunca apaga
        }
        if ($dados === []) {
            return $pessoa;
        }

        return DB::transaction(function () use ($pessoa, $dados, $origem): Pessoa {
            $pessoa->fill($dados);
            if (! $pessoa->isDirty()) {
                return $pessoa;
            }

            $campos = array_keys($pessoa->getDirty());
            $pessoa->save();
            $this->audit->record('pessoas', 'pessoa.atualizada_por_modulo', "Pessoa #{$pessoa->id}", null, [
                'origem' => $origem,
                'campos' => $campos,
            ]);

            return $pessoa;
        });
    }
}
