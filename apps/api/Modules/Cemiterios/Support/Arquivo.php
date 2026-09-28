<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Arquivos do módulo (certidões, mandados, fotos, comprovantes) em disco
 * privado, particionado por tenant; download só por rota autorizada (D2).
 */
final class Arquivo
{
    private const DISCO = 'local';

    public static function guardar(UploadedFile $arquivo, string $pasta): string
    {
        $tenant = app(TenantContext::class)->id();

        return (string) $arquivo->store("cemiterios/{$tenant}/{$pasta}", self::DISCO);
    }

    public static function download(string $caminho): StreamedResponse
    {
        $tenant = app(TenantContext::class)->id();
        abort_unless(str_starts_with($caminho, "cemiterios/{$tenant}/") && Storage::disk(self::DISCO)->exists($caminho), 404);

        return Storage::disk(self::DISCO)->download($caminho);
    }
}
