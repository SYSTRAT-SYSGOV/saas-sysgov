<?php

declare(strict_types=1);

namespace Modules\Pessoas\Support;

/** Um registro de módulo visto pela conciliação: identificador, vínculo atual, documento e dado civil. */
final readonly class RegistroConciliacao
{
    /**
     * @param array{nome?: string|null, nome_social?: string|null, data_nascimento?: string|null, nome_mae?: string|null, nome_pai?: string|null} $dadosCivis
     * @param int|null $responsavelPessoaId responsável (pessoa do cadastro central) quando o registro é de menor
     * @param bool $exigirNascimento false quando o módulo só cadastra adultos (ex.: servidor): permite criar a pessoa
     *        pendente mesmo sem data de nascimento
     * @param array{razao_social: string, nome_fantasia?: string|null}|null $dadosJuridica quando informado, CNPJ sem
     *        pessoa jurídica cadastrada gera a pessoa (o módulo guarda a empresa com razão social e CNPJ)
     */
    public function __construct(
        public int $id,
        public ?int $pessoaId,
        public ?string $documento,
        public array $dadosCivis,
        public ?int $responsavelPessoaId = null,
        public bool $exigirNascimento = true,
        public ?array $dadosJuridica = null,
    ) {}
}
