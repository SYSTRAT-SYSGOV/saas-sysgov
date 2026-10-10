<?php

declare(strict_types=1);

namespace Modules\Escola\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Escola\Models\Escola;
use Modules\Escola\Support\EscolaContext;
use Modules\Escola\Services\Concerns\RegistraMutacao;

/**
 * Configuração da unidade (nome e logo), em disco privado com nome aleatório (design D8).
 * Com várias escolas por órgão, "a unidade" é a escola de trabalho da requisição: os relatórios
 * de cada escola saem com o nome e o logo dela.
 */
final class UnidadeService
{
    use RegistraMutacao;

    public const DISCO = 'local';

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly EscolaContext $escola,
    ) {}

    public function obter(): Escola
    {
        return $this->escola->hasEscola()
            ? $this->escola->get()
            : ($this->escola->escolaUnicaDoTenant() ?? throw new \LogicException('Escola de trabalho não definida.'));
    }

    public function atualizar(string $nome): Escola
    {
        return DB::transaction(function () use ($nome): Escola {
            $unidade = $this->obter();
            $antes = $unidade->toArray();
            $unidade->update(['nome' => trim($nome)]);
            $this->auditar('unidade', 'atualizada', $unidade->id, $antes, $unidade->toArray());

            return $unidade;
        });
    }

    public function definirLogo(UploadedFile $arquivo): Escola
    {
        return DB::transaction(function () use ($arquivo): Escola {
            $unidade = $this->obter();
            $anterior = $unidade->logo_path;
            $caminho = $arquivo->storeAs(
                "escola/{$unidade->tenant_id}/escolas/{$unidade->id}",
                Str::uuid()->toString() . '.' . $arquivo->extension(),
                self::DISCO,
            );
            $unidade->update(['logo_path' => $caminho]);
            if ($anterior !== null) {
                Storage::disk(self::DISCO)->delete($anterior);
            }
            $this->auditar('unidade', 'logo_definido', $unidade->id, ['logo_path' => $anterior], ['logo_path' => $caminho]);

            return $unidade;
        });
    }
}
