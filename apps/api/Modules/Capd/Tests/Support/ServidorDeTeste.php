<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Support;

use Modules\Capd\Models\Servidor;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Cria servidor para os cenários de teste. Desde a Fase 5 o servidor exige `pessoa_id` e não guarda CPF, nome social
 * nem nascimento: eles vão para a pessoa, achada pelo CPF ou criada junto (sem CPF ela fica pendente). Deve rodar
 * dentro do contexto do tenant, como o `Servidor::create` que substitui.
 */
final class ServidorDeTeste
{
    /** @param array<string, mixed> $atributos campos do servidor; `cpf`, `nome_social` e `data_nascimento` vão para a pessoa */
    public static function criar(array $atributos): Servidor
    {
        $documento = Documento::somenteDigitos((string) ($atributos['cpf'] ?? ''));
        $pessoa = $documento !== '' ? Pessoa::query()->where('documento_hash', Documento::hash($documento))->first() : null;
        $pessoa ??= Pessoa::create([
            'tipo' => 'fisica',
            'nome' => (string) ($atributos['nome_completo'] ?? 'Servidor de teste'),
            'nome_social' => $atributos['nome_social'] ?? null,
            'data_nascimento' => $atributos['data_nascimento'] ?? null,
            'documento' => $documento !== '' ? $documento : null,
        ]);
        unset($atributos['cpf'], $atributos['nome_social'], $atributos['data_nascimento']);

        return Servidor::create([...$atributos, 'pessoa_id' => $pessoa->id]);
    }
}
