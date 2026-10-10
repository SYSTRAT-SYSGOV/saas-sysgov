<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Closure;

/** Regras de validação dos dados da entidade (cadastro público, portal e tela do Gestor). */
final class RegrasEntidade
{
    /** @return array<string, mixed> */
    public static function dados(bool $criando, bool $comCnpj = true): array
    {
        $obrig = $criando ? 'required' : 'sometimes';
        $regras = [
            'razao_social' => [$obrig, 'string', 'max:255'],
            'nome_fantasia' => [$obrig, 'string', 'max:255'],
            'inscricao_estadual' => ['nullable', 'string', 'max:30'],
            'inscricao_municipal' => ['nullable', 'string', 'max:30'],
            'endereco' => [$obrig, 'string', 'max:255'],
            'cep' => [$obrig, 'string', 'max:10'],
            'cidade' => [$obrig, 'string', 'max:120'],
            'uf' => [$obrig, 'string', 'size:2'],
            'telefone' => ['nullable', 'string', 'max:20'],
            'celular' => [$obrig, 'string', 'max:20'],
            'representante_legal' => [$obrig, 'string', 'max:255'],
            'cpf_representante' => [$obrig, 'string', 'max:14', self::cpf()],
            'rg_representante' => ['nullable', 'string', 'max:30'],
            'cargo_representante' => [$obrig, 'string', 'max:120'],
            'tempo_funcionamento_anos' => [$obrig, 'integer', 'min:0', 'max:500'],
            'area_atuacao' => [$obrig, 'string', 'max:255'],
            'finalidade' => [$obrig, 'string', 'max:5000'],
            'numero_beneficiarios' => [$obrig, 'integer', 'min:0'],
            'certificacoes' => ['nullable', 'string', 'max:5000'],
            'banco' => ['nullable', 'string', 'max:80'],
            'agencia' => ['nullable', 'string', 'max:20'],
            'conta' => ['nullable', 'string', 'max:30'],
            'chave_pix' => ['nullable', 'string', 'max:120'],
        ];
        if ($comCnpj) {
            $regras['cnpj'] = [$obrig, 'string', 'max:18', self::cnpj()];
        }

        return $regras;
    }

    private static function cpf(): Closure
    {
        return function (string $atributo, mixed $valor, Closure $falhar): void {
            if (!Documento::cpfValido((string) $valor)) {
                $falhar('CPF do representante inválido.');
            }
        };
    }

    private static function cnpj(): Closure
    {
        return function (string $atributo, mixed $valor, Closure $falhar): void {
            if (!Documento::cnpjValido((string) $valor)) {
                $falhar('CNPJ inválido.');
            }
        };
    }

    /**
     * Só dígitos em CNPJ, CPF e CEP; UF em maiúsculas.
     *
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public static function normalizar(array $dados): array
    {
        foreach (['cnpj', 'cpf_representante', 'cep'] as $campo) {
            if (isset($dados[$campo])) {
                $dados[$campo] = Documento::digitos((string) $dados[$campo]);
            }
        }
        if (isset($dados['uf'])) {
            $dados['uf'] = strtoupper((string) $dados['uf']);
        }

        return $dados;
    }
}
