<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo\Importacao;

/**
 * Catálogo de destinos de um valor lido do arquivo (design D-I4). Os destinos de conciliação existem só nos campos
 * nativos; o campo criado pelo órgão só pode ser `extra.*`, que guarda o valor sem alterar o cadastro.
 */
final class Destinos
{
    public const REGISTROS = [
        '00' => 'Escola',
        '20' => 'Turma',
        '30' => 'Pessoa',
        '60' => 'Matrícula',
    ];

    /** Destino extra permitido a cada registro: entidade a que o valor fica ligado. */
    public const EXTRA_POR_REGISTRO = [
        '00' => 'extra.escola',
        '20' => 'extra.turma',
        '30' => 'extra.aluno',
        '60' => 'extra.aluno',
    ];

    /** Tipos aceitos por destino de conciliação; ausente = qualquer tipo. */
    public const TIPO_EXIGIDO = [
        'aluno.nascimento' => 'data',
        'matricula.transporte' => 'booleano',
    ];

    /** @var list<string> */
    public const DE_CONCILIACAO = [
        'escola.inep', 'turma.escola_inep', 'turma.inep',
        'pessoa.escola_inep', 'pessoa.inep', 'pessoa.id_proprio', 'aluno.cpf', 'aluno.nome', 'aluno.nascimento',
        'matricula.escola_inep', 'matricula.aluno_inep', 'matricula.id_proprio', 'matricula.turma_inep', 'matricula.transporte',
    ];

    public static function ehExtra(string $destino): bool
    {
        return str_starts_with($destino, 'extra.');
    }

    /** Entidade (`escola`, `turma`, `aluno`) de um destino `extra.*`. */
    public static function entidadeExtra(string $destino): string
    {
        return substr($destino, 6);
    }
}
