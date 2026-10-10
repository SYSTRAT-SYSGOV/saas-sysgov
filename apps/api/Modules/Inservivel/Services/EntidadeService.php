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
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EntidadeDocumento;
use Modules\Inservivel\Models\Sorteio;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Modules\Inservivel\Support\RegrasEntidade;
use Throwable;

/** Gestão das entidades e dos documentos (spec: Entidades sem fins lucrativos; D6, D12, D15). */
final class EntidadeService
{
    use RegistraMutacao;

    public const PERFIL = 'inservivel_entidade';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ArquivoService $arquivos,
        private readonly ConfiguracaoService $configuracao,
        private readonly TenantContext $tenant,
    ) {}

    /** @param array<string, mixed> $dados */
    public function atualizar(Entidade $entidade, array $dados): Entidade
    {
        $dados = RegrasEntidade::normalizar($dados);
        if (isset($dados['cnpj']) && Entidade::query()->where('cnpj', $dados['cnpj'])->whereKeyNot($entidade->id)->exists()) {
            throw new DomainException('Já existe outra entidade com este CNPJ.');
        }

        return DB::transaction(function () use ($entidade, $dados): Entidade {
            $antes = $entidade->toArray();
            $entidade->fill($dados)->save();
            $this->auditar('entidade', 'atualizada', $entidade->id, $antes, $entidade->toArray());

            return $entidade;
        });
    }

    /** @param list<string> $faltantes nomes dos documentos faltantes ou inconformes */
    public function alterarStatus(Entidade $entidade, StatusEntidade $status, array $faltantes, ?string $observacao): Entidade
    {
        $observacao = trim((string) $observacao);
        $motivo = null;
        if ($status->exigeMotivo()) {
            if ($faltantes === [] && $observacao === '') {
                throw new DomainException('Informe os documentos faltantes ou uma observação para reprovar ou desabilitar a entidade.');
            }
            $partes = [];
            if ($faltantes !== []) {
                $partes[] = "Documentos faltantes ou inconformes:\n- " . implode("\n- ", $faltantes);
            }
            if ($observacao !== '') {
                $partes[] = "Observações:\n" . $observacao;
            }
            $motivo = implode("\n\n", $partes);
        }

        return DB::transaction(function () use ($entidade, $status, $motivo): Entidade {
            $antes = ['status' => $entidade->status->value, 'motivo_reprovacao' => $entidade->motivo_reprovacao];
            $entidade->update(['status' => $status, 'motivo_reprovacao' => $status === StatusEntidade::Habilitada ? null : ($motivo ?? $entidade->motivo_reprovacao)]);
            $this->auditar('entidade', 'status_alterado', $entidade->id, $antes, ['status' => $status->value, 'motivo_reprovacao' => $entidade->motivo_reprovacao]);
            if ($status->exigeMotivo()) {
                // Aviso por e-mail: fica no Outbox até existir o consumidor de e-mail (fora desta change).
                $this->publicar('EntidadeReprovada', ['id' => $entidade->id, 'email' => $entidade->email, 'status' => $status->value, 'motivo' => $motivo]);
            } elseif ($status === StatusEntidade::Habilitada) {
                $this->publicar('EntidadeHabilitada', ['id' => $entidade->id]);
            }

            return $entidade;
        });
    }

    public function enviarDocumento(Entidade $entidade, string $tipo, UploadedFile $arquivo, ?string $validade): EntidadeDocumento
    {
        if (!in_array($tipo, array_column($this->configuracao->documentosExigidos(), 'chave'), true)) {
            throw new DomainException('Tipo de documento não configurado pela prefeitura.');
        }
        $gravado = $this->arquivos->guardar($arquivo, "entidades/{$entidade->id}");
        try {
            return DB::transaction(function () use ($entidade, $tipo, $gravado, $validade): EntidadeDocumento {
                $doc = $entidade->documentos()->create([...$gravado, 'tipo' => $tipo, 'data_envio' => now()->toDateString(), 'validade' => $validade, 'situacao' => 'pendente']);
                $this->auditar('entidade', 'documento_enviado', $entidade->id, null, ['documento_id' => $doc->id, 'tipo' => $tipo, 'validade' => $validade]);

                return $doc;
            });
        } catch (Throwable $e) {
            $this->arquivos->apagar($gravado['caminho']);

            throw $e;
        }
    }

    public function analisarDocumento(EntidadeDocumento $doc, string $situacao, ?string $observacao, ?string $validade, bool $alterarValidade): EntidadeDocumento
    {
        return DB::transaction(function () use ($doc, $situacao, $observacao, $validade, $alterarValidade): EntidadeDocumento {
            $antes = $doc->only(['situacao', 'observacao_prefeitura', 'validade']);
            $doc->fill(['situacao' => $situacao, 'observacao_prefeitura' => $observacao]);
            if ($alterarValidade) {
                $doc->validade = $validade === null ? null : Carbon::parse($validade);
            }
            $doc->save();
            $this->auditar('entidade', 'documento_analisado', $doc->entidade_id, $antes, $doc->only(['id', 'situacao', 'observacao_prefeitura', 'validade']));

            return $doc;
        });
    }

    public function redefinirSenha(Entidade $entidade, string $senha): void
    {
        $usuario = $entidade->usuario;
        if (!$usuario instanceof User) {
            throw new DomainException('Esta entidade não tem conta de acesso.');
        }
        DB::transaction(function () use ($usuario, $senha, $entidade): void {
            $usuario->forceFill(['password' => Hash::make($senha)])->save();
            $this->auditar('entidade', 'senha_redefinida', $entidade->id, null, ['user_id' => $usuario->id]);
        });
    }

    /** Exclusão com a senha do Gestor; bloqueada se a entidade venceu algum sorteio. */
    public function excluir(Entidade $entidade, string $senha, User $gestor): void
    {
        if (!Hash::check($senha, (string) $gestor->getAuthPassword())) {
            throw new DomainException('Senha de confirmação incorreta. A entidade não foi excluída.');
        }
        if (Sorteio::query()->where('entidade_vencedora_id', $entidade->id)->exists()) {
            throw new DomainException('A entidade venceu um sorteio e não pode ser excluída: o resultado precisa ficar registrado.');
        }

        $caminhos = DB::transaction(function () use ($entidade): array {
            $caminhos = $entidade->documentos()->pluck('caminho')->all();
            $antes = $entidade->toArray();
            $usuario = $entidade->usuario;
            $entidade->interesses()->delete();
            $entidade->documentos()->delete();
            $entidade->delete();
            if ($usuario instanceof User) {
                $this->desligarConta($usuario);
            }
            $this->auditar('entidade', 'excluida', $entidade->id, $antes, null);

            return $caminhos;
        });
        foreach ($caminhos as $caminho) {
            $this->arquivos->apagar($caminho);
        }
    }

    /** Tira a conta do tenant e do perfil Entidade; sem outros tenants, a conta é desativada. */
    private function desligarConta(User $usuario): void
    {
        $tenantId = $this->tenant->id();
        $perfis = Role::query()->where('tenant_id', $tenantId)->where('slug', self::PERFIL)->pluck('id');
        $usuario->roles()->wherePivot('tenant_id', $tenantId)->detach($perfis);
        $usuario->tenants()->detach($tenantId);
        if (!$usuario->tenants()->exists()) {
            $usuario->forceFill(['is_active' => false])->save();
        }
        $usuario->clearPermissionCache();
    }
}
