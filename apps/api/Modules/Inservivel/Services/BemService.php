<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\BemFoto;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Throwable;

/** Cadastro de bens e fotos (spec: Cadastro de bens; D2, D3, D4, D12). O bem nunca é excluído. */
final class BemService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly LotacaoService $lotacao,
        private readonly ArquivoService $arquivos,
    ) {}

    /** @param array<string, mixed> $dados validados no controller */
    public function salvar(?Bem $bem, array $dados, User $autor): Bem
    {
        $this->validarSituacao($bem, $dados);
        $this->validarUnidades($bem, $dados);
        if (isset($dados['estado_conservacao_id']) && !EstadoConservacao::query()->whereKey($dados['estado_conservacao_id'])->where('ativo', true)->exists()) {
            throw new DomainException('Estado de conservação inexistente ou inativo.');
        }

        return DB::transaction(function () use ($bem, $dados, $autor): Bem {
            $novo = $bem === null;
            $antes = $bem?->toArray();
            $bem ??= new Bem(['criado_por' => $autor->id]);
            $bem->fill($dados)->save();
            $this->auditar('bem', $novo ? 'criado' : 'atualizado', $bem->id, $antes, $bem->toArray());
            if ($novo) {
                $this->publicar('BemCadastrado', ['id' => $bem->id, 'numero_patrimonial' => $bem->numero_patrimonial]);
            }

            return $bem;
        });
    }

    public function adicionarFoto(Bem $bem, UploadedFile $arquivo, bool $principal): BemFoto
    {
        $gravado = $this->arquivos->guardar($arquivo, "bens/{$bem->id}");
        try {
            return DB::transaction(function () use ($bem, $gravado, $principal): BemFoto {
                $primeira = !$bem->fotos()->exists();
                if ($principal && !$primeira) {
                    $bem->fotos()->update(['principal' => false]);
                }
                $foto = $bem->fotos()->create([...$gravado, 'principal' => $principal || $primeira]);
                $this->auditar('bem', 'foto_adicionada', $bem->id, null, ['foto_id' => $foto->id, 'principal' => $foto->principal]);

                return $foto;
            });
        } catch (Throwable $e) {
            $this->arquivos->apagar($gravado['caminho']);

            throw $e;
        }
    }

    public function definirPrincipal(BemFoto $foto): void
    {
        DB::transaction(function () use ($foto): void {
            BemFoto::query()->where('bem_id', $foto->bem_id)->update(['principal' => false]);
            $foto->update(['principal' => true]);
            $this->auditar('bem', 'foto_principal', $foto->bem_id, null, ['foto_id' => $foto->id]);
        });
    }

    public function removerFoto(BemFoto $foto): void
    {
        DB::transaction(function () use ($foto): void {
            $foto->delete();
            if ($foto->principal) {
                BemFoto::query()->where('bem_id', $foto->bem_id)->orderBy('id')->limit(1)->update(['principal' => true]);
            }
            $this->auditar('bem', 'foto_removida', $foto->bem_id, ['foto_id' => $foto->id], null);
        });
        $this->arquivos->apagar($foto->caminho);
    }

    /** @param array<string, mixed> $dados */
    private function validarSituacao(?Bem $bem, array $dados): void
    {
        if (!array_key_exists('situacao_id', $dados)) {
            return;
        }
        $nova = Situacao::query()->whereKey($dados['situacao_id'])->where('ativo', true)->first();
        if ($nova === null) {
            throw new DomainException('Situação inexistente ou inativa.');
        }
        if ($bem !== null && $bem->situacao_id === $nova->id) {
            return;
        }
        if ($nova->papel?->soPorFluxo() === true) {
            throw new DomainException("A situação \"{$nova->nome}\" só é alcançada pelos fluxos de lote e de transferência.");
        }
        if ($bem !== null && $bem->situacao->papel?->soPorFluxo() === true) {
            throw new DomainException("O bem está \"{$bem->situacao->nome}\": retire-o do lote ou da transferência antes de mudar a situação.");
        }
    }

    /** @param array<string, mixed> $dados */
    private function validarUnidades(?Bem $bem, array $dados): void
    {
        if (!array_key_exists('secretaria_unit_id', $dados) && !array_key_exists('setor_unit_id', $dados)) {
            return;
        }
        $secretariaId = (int) ($dados['secretaria_unit_id'] ?? $bem?->secretaria_unit_id);
        $secretaria = $this->lotacao->secretariaValida($secretariaId);
        if ($secretaria === null) {
            throw new DomainException('Secretaria inexistente ou inativa no Organograma.');
        }
        $setorId = array_key_exists('setor_unit_id', $dados) ? $dados['setor_unit_id'] : $bem?->setor_unit_id;
        if ($setorId !== null && $this->lotacao->setorDaSecretaria((int) $setorId, $secretaria) === null) {
            throw new DomainException('O setor informado não pertence à secretaria escolhida.');
        }
    }
}
