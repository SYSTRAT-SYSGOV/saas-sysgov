<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Modules\Inservivel\Enums\PapelSituacao;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Interesse;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\LoteDocumento;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;
use Throwable;

/**
 * Lotes (spec: Lotes; D4, D5). Toda movimentação de bens acontece em transação com lock nos bens, para que dois
 * lotes não peguem o mesmo bem. Só bens de papel `inservivel` entram; ao entrar vão a `em_lote` e, ao sair, voltam.
 */
final class LoteService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ParametrosService $parametros,
        private readonly ArquivoService $arquivos,
    ) {}

    /** "007" vira "007/<ano>"; números com barra ficam como vieram. */
    public static function normalizarNumero(string $numero): string
    {
        $numero = trim($numero);

        return str_contains($numero, '/') ? $numero : $numero . '/' . now()->year;
    }

    /**
     * @param array<string, mixed> $dados
     * @param list<int> $bensIds
     */
    public function criar(array $dados, array $bensIds, User $autor): Lote
    {
        $dados['numero'] = self::normalizarNumero((string) $dados['numero']);
        $this->garantirNumeroLivre($dados['numero'], null);

        return DB::transaction(function () use ($dados, $bensIds, $autor): Lote {
            $lote = Lote::query()->create([...$dados, 'status' => StatusLote::Aberto, 'criado_por' => $autor->id]);
            $this->auditar('lote', 'criado', $lote->id, null, $lote->toArray());
            if ($bensIds !== []) {
                $this->entrarNoLote($lote, $bensIds);
            }

            return $lote;
        });
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(Lote $lote, array $dados): Lote
    {
        $this->exigirAberto($lote, 'Apenas lotes Abertos podem ser editados.');
        if (isset($dados['numero'])) {
            $dados['numero'] = self::normalizarNumero((string) $dados['numero']);
            $this->garantirNumeroLivre($dados['numero'], $lote->id);
        }

        return DB::transaction(function () use ($lote, $dados): Lote {
            $antes = $lote->toArray();
            $lote->fill($dados)->save();
            $this->auditar('lote', 'atualizado', $lote->id, $antes, $lote->toArray());

            return $lote;
        });
    }

    /** @param list<int> $bensIds */
    public function adicionarBens(Lote $lote, array $bensIds): void
    {
        DB::transaction(function () use ($lote, $bensIds): void {
            $this->exigirAberto(Lote::query()->lockForUpdate()->findOrFail($lote->id), 'Apenas lotes Abertos podem receber novos bens.');
            $this->entrarNoLote($lote, $bensIds);
        });
    }

    /** Busca pelo nº patrimonial exato (ou terminado nele, como no PHP) e adiciona. */
    public function adicionarPorPatrimonio(Lote $lote, string $patrimonio): Bem
    {
        $patrimonio = trim($patrimonio);
        $bem = Bem::query()->where('numero_patrimonial', $patrimonio)->first()
            ?? Bem::query()->where('numero_patrimonial', 'like', '%' . str_replace(['%', '_'], ['\%', '\_'], $patrimonio))->orderBy('id')->first();
        if ($bem === null) {
            throw new DomainException("Patrimônio nº {$patrimonio} não foi encontrado no cadastro de bens.");
        }
        $this->adicionarBens($lote, [$bem->id]);

        return $bem;
    }

    public function retirarBem(Lote $lote, Bem $bem): void
    {
        DB::transaction(function () use ($lote, $bem): void {
            $this->exigirAberto(Lote::query()->lockForUpdate()->findOrFail($lote->id), 'Apenas bens de lotes Abertos podem ser retirados.');
            if (!$lote->bens()->whereKey($bem->id)->exists()) {
                throw new DomainException('Este bem não está neste lote.');
            }
            $lote->bens()->detach($bem->id);
            Bem::query()->whereKey($bem->id)->update(['situacao_id' => $this->parametros->idDoPapel(PapelSituacao::Inservivel)]);
            $this->auditar('lote', 'bem_retirado', $lote->id, ['bem_id' => $bem->id], null);
        });
    }

    public function alterarStatus(Lote $lote, StatusLote $novo): Lote
    {
        return DB::transaction(function () use ($lote, $novo): Lote {
            $atual = Lote::query()->lockForUpdate()->findOrFail($lote->id);
            if ($novo === StatusLote::Sorteado) {
                throw new DomainException('O status Sorteado só é alcançado pelo sorteio.');
            }
            if (!in_array($novo, $atual->status->proximos(), true)) {
                throw new DomainException("Não é possível passar o lote de {$atual->status->rotulo()} para {$novo->rotulo()}.");
            }
            if ($novo === StatusLote::Publicado && !$atual->bens()->exists()) {
                throw new DomainException('Adicione ao menos um bem antes de publicar o lote.');
            }
            $papelDosBens = match ($novo) {
                StatusLote::Entregue => PapelSituacao::Doado,
                StatusLote::Baixado => PapelSituacao::Baixado,
                default => null,
            };
            if ($papelDosBens !== null) {
                Bem::query()->whereIn('id', $atual->bens()->pluck('inservivel_bens.id'))->update(['situacao_id' => $this->parametros->idDoPapel($papelDosBens)]);
            }
            $antes = $atual->status->value;
            $atual->update(['status' => $novo]);
            $this->auditar('lote', 'status_alterado', $atual->id, ['status' => $antes], ['status' => $novo->value]);
            if ($novo === StatusLote::Publicado) {
                $this->publicar('LotePublicado', ['id' => $atual->id, 'numero' => $atual->numero]);
            }

            return $atual;
        });
    }

    /** Exclusão com a senha do usuário logado; bloqueada depois do sorteio. Os bens voltam a `inservivel`. */
    public function excluir(Lote $lote, string $senha, User $usuario): void
    {
        if (!Hash::check($senha, (string) $usuario->getAuthPassword())) {
            throw new DomainException('Senha de confirmação incorreta. O lote não foi excluído.');
        }

        $caminhos = DB::transaction(function () use ($lote): array {
            $atual = Lote::query()->lockForUpdate()->findOrFail($lote->id);
            if ($atual->status->sorteado()) {
                throw new DomainException('Lotes já sorteados não podem ser excluídos: o sorteio precisa ficar registrado.');
            }
            $bens = $atual->bens()->pluck('inservivel_bens.id')->all();
            Bem::query()->whereIn('id', $bens)->update(['situacao_id' => $this->parametros->idDoPapel(PapelSituacao::Inservivel)]);
            $caminhos = $atual->documentos()->pluck('caminho')->all();
            $this->antesDeExcluir($atual);
            $antes = $atual->toArray();
            $atual->bens()->detach();
            $atual->documentos()->delete();
            $atual->delete();
            $this->auditar('lote', 'excluido', $atual->id, [...$antes, 'bens' => $bens], null);

            return $caminhos;
        });
        foreach ($caminhos as $caminho) {
            $this->arquivos->apagar($caminho);
        }
    }

    public function anexar(Lote $lote, string $nome, UploadedFile $arquivo, User $autor): LoteDocumento
    {
        $gravado = $this->arquivos->guardar($arquivo, "lotes/{$lote->id}");
        try {
            return DB::transaction(function () use ($lote, $nome, $gravado, $autor): LoteDocumento {
                $doc = $lote->documentos()->create([...$gravado, 'nome' => $nome, 'criado_por' => $autor->id]);
                $this->auditar('lote', 'documento_anexado', $lote->id, null, ['documento_id' => $doc->id, 'nome' => $nome]);

                return $doc;
            });
        } catch (Throwable $e) {
            $this->arquivos->apagar($gravado['caminho']);

            throw $e;
        }
    }

    /** Inscrições do lote saem junto (lote não sorteado não tem sorteio a preservar). */
    private function antesDeExcluir(Lote $lote): void
    {
        Interesse::query()->where('lote_id', $lote->id)->delete();
    }

    /** @param list<int> $bensIds */
    private function entrarNoLote(Lote $lote, array $bensIds): void
    {
        $inservivel = $this->parametros->idDoPapel(PapelSituacao::Inservivel);
        $bens = Bem::query()->whereIn('id', array_unique($bensIds))->with('situacao')->lockForUpdate()->get();
        if ($bens->count() !== count(array_unique($bensIds))) {
            throw new DomainException('Um ou mais bens não foram encontrados.');
        }
        $invalidos = $bens->filter(fn (Bem $b): bool => $b->situacao_id !== $inservivel);
        if ($invalidos->isNotEmpty()) {
            $lista = $invalidos->map(fn (Bem $b): string => "{$b->numero_patrimonial} ({$b->situacao->nome})")->implode(', ');

            $nome = Situacao::query()->find($inservivel)->nome ?? 'Inservível';

            throw new DomainException("Apenas bens com a situação \"{$nome}\" podem entrar no lote. Fora da situação: {$lista}.");
        }
        $lote->bens()->attach($bens->pluck('id')->all(), ['tenant_id' => $lote->tenant_id]);
        Bem::query()->whereIn('id', $bens->pluck('id'))->update(['situacao_id' => $this->parametros->idDoPapel(PapelSituacao::EmLote)]);
        $this->auditar('lote', 'bens_adicionados', $lote->id, null, ['bens' => $bens->pluck('numero_patrimonial')->all()]);
    }

    private function exigirAberto(Lote $lote, string $mensagem): void
    {
        if ($lote->status !== StatusLote::Aberto) {
            throw new DomainException($mensagem);
        }
    }

    private function garantirNumeroLivre(string $numero, ?int $ignorar): void
    {
        if (Lote::query()->where('numero', $numero)->when($ignorar !== null, fn ($q) => $q->whereKeyNot($ignorar))->exists()) {
            throw new DomainException("Já existe o lote nº {$numero}.");
        }
    }
}
