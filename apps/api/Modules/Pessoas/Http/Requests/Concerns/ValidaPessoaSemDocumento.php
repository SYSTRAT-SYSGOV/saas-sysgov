<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests\Concerns;

use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Regras de pessoa física sem CPF (documento pendente): nome e nascimento obrigatórios e, para menor de
 * idade, um responsável que seja pessoa física do mesmo tenant (unificar-cadastro-pessoas, D1 e D2).
 */
trait ValidaPessoaSemDocumento
{
    public const MAIORIDADE = 18;

    /** Responsável legal: pessoa física do mesmo tenant e não excluída. */
    protected function regraResponsavel(): Exists
    {
        return Rule::exists('pessoas', 'id')
            ->where('tipo', 'fisica')
            ->where('tenant_id', app(TenantContext::class)->id())
            ->whereNull('deleted_at');
    }

    /**
     * @param bool $semDocumento a pessoa fica (ou continua) sem CPF depois desta requisição
     * @param mixed $nascimento data de nascimento efetiva (informada ou já gravada)
     * @param mixed $responsavelId responsável efetivo (informado ou já gravado)
     * @param int|null $pessoaId pessoa em edição, que não pode ser responsável de si mesma
     */
    protected function validarPessoaSemDocumento(Validator $validator, bool $semDocumento, mixed $nascimento, mixed $responsavelId, ?int $pessoaId = null): void
    {
        if ($pessoaId !== null && $responsavelId !== null && (int) $responsavelId === $pessoaId) {
            $validator->errors()->add('responsavel_id', 'A pessoa não pode ser responsável por ela mesma.');
        }

        if (! $semDocumento) {
            return;
        }

        if (empty($nascimento)) {
            $validator->errors()->add('data_nascimento', 'A data de nascimento é obrigatória para pessoa sem CPF.');

            return;
        }

        $menor = CarbonImmutable::parse((string) $nascimento)->age < self::MAIORIDADE;
        if ($menor && empty($responsavelId)) {
            $validator->errors()->add('responsavel_id', 'O responsável é obrigatório para menor de idade sem CPF.');
        }
    }
}
