<?php

declare(strict_types=1);

namespace Modules\Transporte\Services;

use DomainException;
use Modules\Transporte\Censo\Campo;
use Modules\Transporte\Censo\Leiaute;

/** Resolve a seleção de campos do usuário contra o catálogo do leiaute (design D35). */
final class SelecaoCampos
{
    /**
     * Obrigatórios entram sempre; chaves que o leiaute não tem são ignoradas e devolvidas em `ignorados`; campo
     * sensível só passa se estiver em `$confirmados`. A ordem final é a das colunas do leiaute.
     *
     * @param list<string> $escolhidos
     * @param list<string> $confirmados chaves de campos sensíveis que o usuário confirmou
     * @return array{campos: list<string>, sensiveis: list<string>, ignorados: list<string>}
     */
    public static function resolver(Leiaute $leiaute, array $escolhidos, array $confirmados = []): array
    {
        $catalogo = [];
        foreach ($leiaute->campos() as $campo) {
            $catalogo[$campo->chave] = $campo;
        }
        $ignorados = array_values(array_diff(array_unique($escolhidos), array_keys($catalogo)));
        $validos = array_intersect($escolhidos, array_keys($catalogo));

        $campos = [];
        $sensiveis = [];
        foreach ($catalogo as $chave => $campo) {
            if ($campo->obrigatorio) {
                $campos[] = $chave;
                continue;
            }
            if (!in_array($chave, $validos, true)) {
                continue;
            }
            if ($campo->sensivel) {
                if (!in_array($chave, $confirmados, true)) {
                    throw new DomainException("O campo sensível \"{$campo->rotulo}\" exige confirmação explícita.");
                }
                $sensiveis[] = $chave;
            }
            $campos[] = $chave;
        }

        return ['campos' => $campos, 'sensiveis' => $sensiveis, 'ignorados' => $ignorados];
    }

    /**
     * Campos do modelo padrão: todos os do catálogo que não são sensíveis.
     *
     * @return list<string>
     */
    public static function padrao(Leiaute $leiaute): array
    {
        return array_values(array_map(fn (Campo $c): string => $c->chave, array_filter($leiaute->campos(), fn (Campo $c): bool => !$c->sensivel)));
    }
}
