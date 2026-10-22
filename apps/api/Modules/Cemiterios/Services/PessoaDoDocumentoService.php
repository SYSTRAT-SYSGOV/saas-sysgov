<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Services;

use Illuminate\Validation\ValidationException;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\PessoaService;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\Documento;

/**
 * Resolve a pessoa do cadastro central de quem foi cadastrado nos Cemitérios (operador, herdeiro de sucessão).
 *
 * Desde a Fase 5 esses registros não guardam o documento: ele mora na pessoa, e `pessoa_id` é obrigatório. Então o
 * documento digitado (quando houver) só serve para achar ou criar a pessoa.
 */
final class PessoaDoDocumentoService
{
    private const ORIGEM = 'cemiterios';

    public function __construct(
        private readonly ResolucaoPessoaService $resolucao,
        private readonly PessoaService $pessoas,
    ) {}

    /**
     * @param int|null $pessoaId pessoa já escolhida (seletor de pessoas): vale sobre o documento digitado
     * @param Pessoa|null $atual pessoa que o registro já tem: se estiver com documento pendente e o CPF digitado
     *        for novo no cadastro, ela é regularizada em vez de criar outra
     * @param string $campo nome do campo na mensagem de erro
     *
     * @throws ValidationException documento digitado que não é CPF nem CNPJ válido
     */
    public function resolver(string $nome, ?string $documento, ?int $pessoaId = null, ?Pessoa $atual = null, string $campo = 'documento'): Pessoa
    {
        if ($pessoaId !== null) {
            return Pessoa::query()->findOrFail($pessoaId);
        }

        // Texto mascarado (`***.982.247-**`) é o que a tela mostra de volta, não um documento.
        $digitado = str_contains((string) $documento, '*') ? '' : (string) $documento;
        $digitos = Documento::somenteDigitos($digitado);

        if ($digitos === '') {
            return $atual ?? $this->resolucao->resolverSemDocumento(['nome' => $nome], self::ORIGEM, null, true, false, true);
        }

        if (strlen($digitos) === 11 && Documento::valido($digitos)) {
            if ($atual?->documento_pendente === true && ! Pessoa::withTrashed()->where('tipo', 'fisica')->where('documento_hash', Documento::hash($digitos))->exists()) {
                return $this->pessoas->regularizarDocumento($atual, $digitos);
            }

            return $this->resolucao->resolverPorCpf($digitos, ['nome' => $nome], self::ORIGEM);
        }

        if (strlen($digitos) === 14 && Documento::valido($digitos, 'juridica')) {
            return $this->resolucao->resolverPorCnpj($digitos, $nome, null, self::ORIGEM);
        }

        throw ValidationException::withMessages([$campo => 'O CPF ou CNPJ informado é inválido.']);
    }
}
