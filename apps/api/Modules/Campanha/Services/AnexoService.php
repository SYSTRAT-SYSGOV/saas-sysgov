<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Comprovantes, imagens de material e fotos de entrega (D5): disco privado, caminho por tenant/campanha/recurso, só
 * baixados pela API (a policy do recurso autoriza antes). Trocar o arquivo apaga o anterior; excluir o registro não
 * apaga o arquivo (prova contábil).
 */
final class AnexoService
{
    public const DISCO = 'local';

    /** Regra de validação do upload (PDF ou imagem, até 10 MB). */
    public const REGRA = ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'];

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Grava o arquivo no campo do registro (ex.: comprovante, imagem, foto).
     *
     * @template T of Model
     *
     * @param T $registro
     * @return T
     */
    public function guardar(Model $registro, string $campo, string $recurso, UploadedFile $arquivo): Model
    {
        $anterior = $registro->getAttribute($campo);
        $pasta = sprintf('campanha/%d/%d/%s', (int) $registro->getAttribute('tenant_id'), (int) $registro->getAttribute('campanha_id'), $recurso);
        $extensao = strtolower($arquivo->guessExtension() ?? $arquivo->getClientOriginalExtension());
        $caminho = $arquivo->storeAs($pasta, Str::uuid()->toString() . '.' . $extensao, self::DISCO);
        if ($caminho === false) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        try {
            DB::transaction(function () use ($registro, $campo, $caminho, $recurso): void {
                $registro->forceFill([$campo => $caminho])->save();
                $this->audit->record('campanha', "{$recurso}.{$campo}_anexado", "{$recurso}:{$registro->getKey()}", null, ['arquivo' => basename($caminho)]);
            });
        } catch (Throwable $e) {
            Storage::disk(self::DISCO)->delete($caminho);

            throw $e;
        }
        if (is_string($anterior) && $anterior !== $caminho) {
            Storage::disk(self::DISCO)->delete($anterior);
        }

        return $registro;
    }

    /** Resposta com o arquivo, ou null se o registro não tem arquivo. */
    public function resposta(Model $registro, string $campo, string $nome): ?StreamedResponse
    {
        $caminho = $registro->getAttribute($campo);
        $disco = Storage::disk(self::DISCO);
        if (!is_string($caminho) || !$disco->exists($caminho)) {
            return null;
        }

        return $disco->response($caminho, $nome . '.' . pathinfo($caminho, PATHINFO_EXTENSION), ['X-Content-Type-Options' => 'nosniff'], 'inline');
    }
}
