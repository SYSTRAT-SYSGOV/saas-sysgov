<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use Carbon\CarbonImmutable;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;
use Modules\Pessoas\Support\RegraNegocioException;

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
            $pessoa = Pessoa::withTrashed()->where('documento_hash', Documento::hash($cpf))->first();

            if ($pessoa === null) {
                $pessoa = Pessoa::create(['documento' => $cpf, 'tipo' => 'fisica', ...$dados]);
                $this->audit->record('pessoas', 'pessoa.criada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem, 'nome' => $pessoa->nome]);

                return $pessoa;
            }

            if ($pessoa->trashed()) {
                $pessoa->restore();
                $this->audit->record('pessoas', 'pessoa.restaurada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem]);
            }

            return $this->completarCamposVazios($pessoa, $dados, $origem);
        });
    }

    /**
     * Pessoa jurídica do tenant com o CNPJ, criada se não existir (razão social obrigatória). Como na pessoa
     * física, de existente só completa o que está vazio. Para consumidores que guardam a empresa por CNPJ
     * (Inservível, Procurement, Cursos).
     */
    public function resolverPorCnpj(string $cnpj, string $razaoSocial, ?string $nomeFantasia, string $origem): Pessoa
    {
        if (! Documento::valido($cnpj, 'juridica')) {
            throw new DomainException('CNPJ inválido.');
        }
        $razaoSocial = trim($razaoSocial);
        if ($razaoSocial === '') {
            throw new DomainException('A razão social é obrigatória para pessoa jurídica.');
        }

        return DB::transaction(function () use ($cnpj, $razaoSocial, $nomeFantasia, $origem): Pessoa {
            /** @var Pessoa|null $pessoa */
            $pessoa = Pessoa::withTrashed()->where('tipo', 'juridica')->where('documento_hash', Documento::hash($cnpj))->first();

            if ($pessoa === null) {
                $pessoa = Pessoa::create(['documento' => $cnpj, 'tipo' => 'juridica', 'razao_social' => $razaoSocial, 'nome_fantasia' => $nomeFantasia]);
                $this->audit->record('pessoas', 'pessoa.criada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem, 'nome' => $pessoa->nome]);

                return $pessoa;
            }
            if ($pessoa->trashed()) {
                $pessoa->restore();
                $this->audit->record('pessoas', 'pessoa.restaurada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem]);
            }

            return $this->completarCamposVazios($pessoa, array_filter(['nome_fantasia' => $nomeFantasia], fn ($v): bool => $v !== null && $v !== ''), $origem);
        });
    }

    /**
     * Versão tolerante do consumidor: devolve a pessoa jurídica do CNPJ ou `null` quando o CNPJ falta ou é
     * inválido (o módulo grava o registro mesmo assim e a conciliação trata depois).
     */
    public function tentarPorCnpj(?string $cnpj, ?string $razaoSocial, ?string $nomeFantasia, string $origem): ?Pessoa
    {
        $digitos = Documento::somenteDigitos((string) $cnpj);
        if ($digitos === '' || ! Documento::valido($digitos, 'juridica') || trim((string) $razaoSocial) === '') {
            return null;
        }

        return $this->resolverPorCnpj($digitos, (string) $razaoSocial, $nomeFantasia, $origem);
    }

    /**
     * Pessoas físicas do tenant com o mesmo nome e a mesma data de nascimento — candidatas a duplicidade
     * quando o módulo cadastra alguém sem CPF. O nome é comparado sem acento, caixa e espaços repetidos.
     *
     * @return Collection<int, Pessoa>
     */
    public function sugerirSemelhantes(string $nome, string $dataNascimento): Collection
    {
        $alvo = $this->normalizarNome($nome);

        return Pessoa::query()
            ->where('tipo', 'fisica')
            ->whereDate('data_nascimento', $dataNascimento)
            ->get()
            ->filter(fn (Pessoa $p): bool => $this->normalizarNome($p->nome) === $alvo)
            ->values();
    }

    /**
     * Recusa o cadastro quando já existe pessoa com o mesmo nome e a mesma data de nascimento, devolvendo as
     * candidatas para o usuário escolher uma delas ou confirmar que se trata de outra pessoa.
     *
     * @throws RegraNegocioException `pessoa_semelhante_existente`, com `sugestoes` no contexto
     */
    public function exigirSemSemelhantes(string $nome, string $dataNascimento): void
    {
        $semelhantes = $this->sugerirSemelhantes($nome, $dataNascimento);
        if ($semelhantes->isEmpty()) {
            return;
        }

        throw new RegraNegocioException('pessoa_semelhante_existente', 'Já existe pessoa com o mesmo nome e data de nascimento.', [
            'sugestoes' => $semelhantes->map(fn (Pessoa $p): array => [
                'id' => $p->id,
                'nome' => $p->nome,
                'cpf_mascarado' => $p->cpf_mascarado,
                'documento_pendente' => $p->documento_pendente,
            ])->all(),
        ]);
    }

    /**
     * Cria pessoa física sem CPF (documento pendente) para um módulo consumidor. Antes de criar, recusa se
     * houver pessoa semelhante (mesmo nome e nascimento), devolvendo as sugestões; o módulo então usa uma
     * delas ou repete a chamada com `$confirmarNovo` para criar de fato. Menor de idade exige responsável.
     *
     * @param array{nome?: string|null, data_nascimento?: string|null, nome_social?: string|null, nome_mae?: string|null, nome_pai?: string|null} $dadosCivis
     * @param string $origem módulo consumidor (aparece na auditoria)
     * @param bool $dispensarResponsavel true para registro histórico de quem já morreu: não vale a regra de menor
     * @param bool $exigirNascimento false para módulos que só cadastram adultos (ex.: servidor vindo do RH): sem
     *        nascimento não há como sugerir semelhantes nem testar a menoridade, e a pessoa é criada mesmo assim
     */
    public function resolverSemDocumento(array $dadosCivis, string $origem, ?int $responsavelId = null, bool $confirmarNovo = false, bool $exigirNascimento = true, bool $dispensarResponsavel = false): Pessoa
    {
        $nome = trim((string) ($dadosCivis['nome'] ?? ''));
        $nascimento = (string) ($dadosCivis['data_nascimento'] ?? '');
        if ($nome === '' || ($exigirNascimento && $nascimento === '')) {
            throw new RegraNegocioException('dados_insuficientes', 'Nome e data de nascimento são obrigatórios para cadastrar pessoa sem CPF.');
        }

        $menor = ! $dispensarResponsavel && $nascimento !== '' && CarbonImmutable::parse($nascimento)->age < 18;
        if ($menor && $responsavelId === null) {
            throw new RegraNegocioException('responsavel_obrigatorio', 'O responsável é obrigatório para menor de idade sem CPF.');
        }
        if ($responsavelId !== null && ! Pessoa::query()->where('tipo', 'fisica')->whereKey($responsavelId)->exists()) {
            throw new RegraNegocioException('responsavel_invalido', 'O responsável deve ser uma pessoa física cadastrada neste órgão.');
        }

        if (! $confirmarNovo && $nascimento !== '') {
            $this->exigirSemSemelhantes($nome, $nascimento);
        }

        $dados = array_filter(
            array_intersect_key($dadosCivis, array_flip(self::CAMPOS_CIVIS)),
            fn ($v): bool => $v !== null && $v !== '',
        );

        return DB::transaction(function () use ($dados, $responsavelId, $origem): Pessoa {
            $pessoa = Pessoa::create(['tipo' => 'fisica', 'responsavel_id' => $responsavelId, ...$dados]);
            $this->audit->record('pessoas', 'pessoa.criada_por_modulo', "Pessoa #{$pessoa->id}", null, ['origem' => $origem, 'nome' => $pessoa->nome, 'documento_pendente' => true]);

            return $pessoa;
        });
    }

    /**
     * Só completa o que estiver vazio: o cadastro mestre não é sobrescrito por um consumidor.
     *
     * @param array<string, mixed> $dados
     */
    public function completarCamposVazios(Pessoa $pessoa, array $dados, string $origem): Pessoa
    {
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
    }

    private function normalizarNome(string $nome): string
    {
        return (string) preg_replace('/\s+/', ' ', mb_strtolower(trim(Str::ascii($nome))));
    }

    /** CPF válido? (atalho para os consumidores validarem antes de gravar) */
    public static function cpfValido(string $cpf): bool
    {
        return Documento::valido($cpf);
    }
}
