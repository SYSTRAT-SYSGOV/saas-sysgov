<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Importa uma pessoa física ou jurídica vinda de um sistema de gestão da prefeitura,
 * com deduplicação por documento exato (CPF ou CNPJ) dentro do tipo. Nunca promove a
 * pessoa a usuário.
 */
final readonly class ImportacaoPessoaService
{
    private const CAMPOS_IMPORTAVEIS = [
        'nome', 'nome_social', 'data_nascimento', 'sexo', 'nome_mae',
        'nome_pai', 'estado_civil', 'nacionalidade', 'naturalidade', 'nis',
        'razao_social', 'nome_fantasia', 'inscricao_estadual', 'inscricao_municipal',
        'porte', 'natureza_juridica',
    ];

    /**
     * @param array<string, mixed> $dadosExternos
     * @return array{pessoa: Pessoa|null, criada: bool, erro: string|null}
     */
    public function importar(array $dadosExternos): array
    {
        $tipo = (string) ($dadosExternos['tipo'] ?? 'fisica');
        $documento = (string) ($dadosExternos['cnpj'] ?? $dadosExternos['cpf'] ?? '');
        $rotulo = $tipo === 'juridica' ? 'CNPJ' : 'CPF';

        if ($documento === '') {
            return ['pessoa' => null, 'criada' => false, 'erro' => "{$rotulo} ausente: a importação exige o documento; pessoa sem documento é cadastrada pelo módulo de origem"];
        }
        if (!Documento::valido($documento, $tipo)) {
            return ['pessoa' => null, 'criada' => false, 'erro' => "{$rotulo} inválido: {$documento}"];
        }

        $dados = array_intersect_key($dadosExternos, array_flip(self::CAMPOS_IMPORTAVEIS));
        $dados['tipo'] = $tipo;
        $dados['documento'] = $documento;

        $existente = Pessoa::where('tipo', $tipo)->where('documento_hash', Documento::hash($documento))->first();

        if ($existente) {
            $existente->update($dados);

            return ['pessoa' => $existente, 'criada' => false, 'erro' => null];
        }

        return ['pessoa' => Pessoa::create($dados), 'criada' => true, 'erro' => null];
    }
}
