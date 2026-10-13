<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\Role;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Modules\Inservivel\Support\RegrasEntidade;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Throwable;

/**
 * Cadastro da entidade com conta SYSGOV de perfil restrito (D6): usuário, vínculo ao tenant só com o perfil
 * Entidade (Inservível), representante no Cadastro de Pessoas, entidade Pendente e documentos — numa transação.
 * Usado pelo cadastro público e pelo Gestor. Não reaproveita contas nem revela se o e-mail ou o CNPJ já existe.
 */
final class CadastroEntidadeService
{
    use RegistraMutacao;

    public const MENSAGEM_DUPLICADO = 'Não foi possível concluir o cadastro: e-mail ou CNPJ já cadastrado. Se a entidade já tem conta, entre pelo login.';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ArquivoService $arquivos,
        private readonly ConfiguracaoService $configuracao,
        private readonly ResolucaoPessoaService $pessoas,
        private readonly TenantContext $tenant,
    ) {}

    /** @return list<array{chave: string, nome: string, obrigatorio: bool}> */
    public function documentosExigidos(): array
    {
        return $this->configuracao->documentosExigidos();
    }

    /**
     * @param array<string, mixed> $dados dados validados da entidade (inclui email)
     * @param array<string, UploadedFile> $documentos chave do documento exigido => arquivo
     * @param array<string, string|null> $validades chave => data de validade (opcional)
     */
    public function cadastrar(array $dados, string $senha, array $documentos, array $validades, string $origem, bool $exigirObrigatorios = true): Entidade
    {
        $dados = RegrasEntidade::normalizar($dados);
        $email = mb_strtolower(trim((string) $dados['email']));
        $dados['email'] = $email;
        $exigidos = $this->configuracao->documentosExigidos();
        foreach ($exigidos as $doc) {
            if ($exigirObrigatorios && $doc['obrigatorio'] && !isset($documentos[$doc['chave']])) {
                throw new DomainException("Envie o documento obrigatório: {$doc['nome']}.");
            }
        }
        $chaves = array_column($exigidos, 'chave');
        $documentos = array_intersect_key($documentos, array_flip($chaves));
        if (User::query()->where('email', $email)->exists() || Entidade::query()->where('cnpj', $dados['cnpj'])->orWhere('email', $email)->exists()) {
            throw new DomainException(self::MENSAGEM_DUPLICADO);
        }
        $perfil = Role::query()->where('tenant_id', $this->tenant->id())->where('slug', EntidadeService::PERFIL)->first();
        if ($perfil === null) {
            throw new DomainException('O perfil Entidade ainda não foi provisionado para esta prefeitura.');
        }

        $gravados = [];
        try {
            foreach ($documentos as $chave => $arquivo) {
                $gravados[$chave] = $this->arquivos->guardar($arquivo, 'entidades/novas');
            }

            return DB::transaction(function () use ($dados, $email, $senha, $perfil, $gravados, $validades, $origem): Entidade {
                $usuario = User::query()->create(['name' => (string) $dados['nome_fantasia'], 'email' => $email, 'password' => Hash::make($senha), 'is_active' => true]);
                $usuario->tenants()->attach($this->tenant->id(), ['role_id' => $perfil->id, 'status' => 'active', 'is_primary' => true]);
                $usuario->roles()->attach($perfil->id, ['tenant_id' => $this->tenant->id()]);
                $this->ligarPessoa($usuario, (string) $dados['cpf_representante'], (string) $dados['representante_legal']);

                $entidade = Entidade::query()->create([...$dados, 'user_id' => $usuario->id, 'status' => StatusEntidade::Pendente, 'lotes_ganhos' => 0]);
                foreach ($gravados as $chave => $gravado) {
                    $entidade->documentos()->create([...$gravado, 'tipo' => $chave, 'data_envio' => now()->toDateString(), 'validade' => $validades[$chave] ?? null, 'situacao' => 'pendente']);
                }
                $this->auditar('entidade', 'cadastrada', $entidade->id, null, ['origem' => $origem, 'razao_social' => $entidade->razao_social, 'user_id' => $usuario->id]);
                $this->publicar('EntidadeCadastrada', ['id' => $entidade->id, 'origem' => $origem]);

                return $entidade;
            });
        } catch (Throwable $e) {
            foreach ($gravados as $gravado) {
                $this->arquivos->apagar($gravado['caminho']);
            }

            throw $e;
        }
    }

    /** Representante no Cadastro de Pessoas; liga a pessoa à conta se ela ainda não tiver usuário. */
    private function ligarPessoa(User $usuario, string $cpf, string $nome): void
    {
        $pessoa = $this->pessoas->resolverPorCpf($cpf, ['nome' => $nome], 'inservivel');
        if (!$pessoa->usuario()->exists()) {
            $pessoa->usuario()->create(['user_id' => $usuario->id, 'promovido_em' => now(), 'promovido_por' => null]);
        }
    }
}
