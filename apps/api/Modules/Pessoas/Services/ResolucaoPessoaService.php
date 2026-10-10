<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

/**
 * Resolução de pessoa por CPF para os módulos consumidores (Escola, Cursos, Admin — design D4).
 * Devolve a pessoa do tenant com o CPF ou a cria; de pessoa existente só preenche dados civis
 * vazios (nunca sobrescreve o cadastro mestre) e nunca cria usuário de acesso.
 */
final class ResolucaoPessoaService
{
    private const CAMPOS_CIVIS = ['nome', 'nome_social', 'data_nascimento', 'nome_mae', 'nome_pai'];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param array{nome: string, nome_social?: string|null, data_nascimento?: string|null, nome_mae?: string|null, nome_pai?: string|null} $dadosCivis
     * @param string $origem módulo consumidor (aparece na auditoria)
     */
    public function resolverPorCpf(string $cpf, array $dadosCivis, string $origem): Pessoa
    {
        if (!Documento::valido($cpf)) {
            throw new DomainException('CPF inválido.');
        }

        $dados = array_filter(
            array_intersect_key($dadosCivis, array_flip(self::CAMPOS_CIVIS)),
            fn ($v): bool => $v !== null && $v !== '',
        );

        return DB::transaction(function () use ($cpf, $dados, $origem): Pessoa {
            /** @var Pessoa|null $pessoa */
            $pessoa = Pessoa::withTrashed()->where('cpf_hash', Documento::hash($cpf))->first();

            if ($pessoa === null) {
                $pessoa = Pessoa::create(['cpf' => $cpf, ...$dados]);
                $this->audit->record('pessoas', 'pessoa.criada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem, 'nome' => $pessoa->nome]);

                return $pessoa;
            }

            if ($pessoa->trashed()) {
                $pessoa->restore();
                $this->audit->record('pessoas', 'pessoa.restaurada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem]);
            }

            // Só completa o que estiver vazio: o cadastro mestre não é sobrescrito por um consumidor.
            foreach ($dados as $campo => $valor) {
                if ($pessoa->getAttribute($campo) === null || $pessoa->getAttribute($campo) === '') {
                    $pessoa->setAttribute($campo, $valor);
                }
            }
            if ($pessoa->isDirty()) {
                $alterados = array_keys($pessoa->getDirty());
                $pessoa->save();
                $this->audit->record('pessoas', 'pessoa.completada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem, 'campos' => $alterados]);
            }

            return $pessoa;
        });
    }

    /** CPF válido? (atalho para os consumidores validarem antes de gravar) */
    public static function cpfValido(string $cpf): bool
    {
        return Documento::valido($cpf);
    }
}
