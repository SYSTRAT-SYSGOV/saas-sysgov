<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Importa uma pessoa vinda de um sistema de gestão da prefeitura, com
 * deduplicação por CPF exato. Nunca promove a pessoa a usuário.
 */
final readonly class ImportacaoPessoaService
{
    private const CAMPOS_IMPORTAVEIS = [
        'nome', 'nome_social', 'data_nascimento', 'sexo', 'nome_mae',
        'nome_pai', 'estado_civil', 'nacionalidade', 'naturalidade', 'nis',
    ];

    /**
     * @param array<string, mixed> $dadosExternos
     * @return array{pessoa: Pessoa|null, criada: bool, erro: string|null}
     */
    public function importar(array $dadosExternos): array
    {
        $cpf = (string) ($dadosExternos['cpf'] ?? '');

        if (!Documento::valido($cpf)) {
            return ['pessoa' => null, 'criada' => false, 'erro' => "CPF inválido: {$cpf}"];
        }

        $dados = array_intersect_key($dadosExternos, array_flip(self::CAMPOS_IMPORTAVEIS));
        $dados['cpf'] = $cpf;

        $existente = Pessoa::where('cpf_hash', Documento::hash($cpf))->first();

        if ($existente) {
            $existente->update($dados);

            return ['pessoa' => $existente, 'criada' => false, 'erro' => null];
        }

        return ['pessoa' => Pessoa::create($dados), 'criada' => true, 'erro' => null];
    }
}
