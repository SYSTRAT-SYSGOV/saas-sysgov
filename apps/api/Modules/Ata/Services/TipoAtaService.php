<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaTipo;

/** Tipos de ata do tenant. Na primeira consulta o tenant recebe os tipos padrão. */
final class TipoAtaService
{
    public const PADRAO = ['Reunião ordinária', 'Reunião extraordinária', 'Ata do conselho', 'Audiência pública', 'Comissão'];

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /** @return \Illuminate\Database\Eloquent\Collection<int, AtaTipo> */
    public function listar(bool $soAtivos = false)
    {
        if (!AtaTipo::query()->exists()) {
            foreach (self::PADRAO as $nome) {
                AtaTipo::query()->create(['nome' => $nome, 'ativo' => true]);
            }
        }

        return AtaTipo::query()->when($soAtivos, fn ($q) => $q->where('ativo', true))->orderBy('nome')->get();
    }

    public function salvar(?AtaTipo $tipo, string $nome, bool $ativo): AtaTipo
    {
        $nome = trim($nome);
        $repetido = AtaTipo::query()->where('nome', $nome)->when($tipo !== null, fn ($q) => $q->whereKeyNot($tipo->id))->exists();
        if ($repetido) {
            throw new DomainException('Já existe um tipo de ata com esse nome.');
        }

        return DB::transaction(function () use ($tipo, $nome, $ativo): AtaTipo {
            $antes = $tipo?->only(['nome', 'ativo']);
            $tipo ??= new AtaTipo();
            $tipo->fill(['nome' => $nome, 'ativo' => $ativo])->save();
            $this->audit->record('ata', $antes === null ? 'tipo.criado' : 'tipo.editado', "tipo:{$tipo->id}", $antes, $tipo->only(['nome', 'ativo']));

            return $tipo;
        });
    }

    /** Tipo já usado em ata é só desativado, para não apagar o histórico. */
    public function excluir(AtaTipo $tipo): void
    {
        DB::transaction(function () use ($tipo): void {
            if (Ata::query()->where('tipo_id', $tipo->id)->exists()) {
                $tipo->update(['ativo' => false]);
                $this->audit->record('ata', 'tipo.desativado', "tipo:{$tipo->id}", ['ativo' => true], ['ativo' => false]);

                return;
            }
            $tipo->delete();
            $this->audit->record('ata', 'tipo.excluido', "tipo:{$tipo->id}", $tipo->only(['nome']), null);
        });
    }
}
