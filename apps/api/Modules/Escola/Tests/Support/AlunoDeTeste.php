<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Support;

use Modules\Escola\Models\Aluno;
use Modules\Pessoas\Models\Pessoa;

/**
 * Cria aluno para os cenários de teste. Desde a Fase 5 o aluno exige `pessoa_id` e não guarda CPF nem nascimento:
 * eles vão para a pessoa criada junto (sem documento, ela fica pendente, como no cadastro real de um menor).
 * Deve rodar dentro do contexto do tenant, como o `Aluno::create` que substitui.
 */
final class AlunoDeTeste
{
    /** @param array<string, mixed> $atributos campos do aluno; `cpf` e `nascimento` vão para a pessoa */
    public static function criar(array $atributos): Aluno
    {
        $pessoa = Pessoa::create([
            'tipo' => 'fisica',
            'nome' => (string) ($atributos['nome'] ?? 'Aluno de teste'),
            'documento' => $atributos['cpf'] ?? null,
            'data_nascimento' => $atributos['nascimento'] ?? null,
        ]);
        unset($atributos['cpf'], $atributos['nascimento']);

        $aluno = new Aluno($atributos);
        $aluno->forceFill(['pessoa_id' => $pessoa->id])->save();

        return $aluno;
    }
}
