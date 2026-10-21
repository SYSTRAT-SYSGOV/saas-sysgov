<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Support;

use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Models\SucessaoHerdeiro;
use Modules\Pessoas\Models\Pessoa;

/**
 * Cria operador e herdeiro para os cenários de teste. Desde a Fase 5 eles exigem `pessoa_id` e não guardam o documento:
 * `cpf_cnpj` e `documento` vão para a pessoa criada junto (sem documento, ela fica pendente). Deve rodar dentro do
 * contexto do tenant, como o `create` que substitui.
 */
final class RegistroDeTeste
{
    /** @param array<string, mixed> $atributos */
    public static function operador(array $atributos): OperadorCemiterio
    {
        $atributos['pessoa_id'] ??= self::pessoa((string) ($atributos['nome'] ?? 'Operador de teste'), $atributos['cpf_cnpj'] ?? null)->id;
        unset($atributos['cpf_cnpj']);

        return OperadorCemiterio::create($atributos);
    }

    /** @param array<string, mixed> $atributos */
    public static function herdeiro(array $atributos): SucessaoHerdeiro
    {
        $atributos['pessoa_id'] ??= self::pessoa((string) ($atributos['nome'] ?? 'Herdeiro de teste'), $atributos['documento'] ?? null)->id;
        unset($atributos['documento']);

        return SucessaoHerdeiro::create($atributos);
    }

    private static function pessoa(string $nome, mixed $documento): Pessoa
    {
        return Pessoa::create(['tipo' => 'fisica', 'nome' => $nome, 'documento' => $documento]);
    }
}
