<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Services;

use App\Models\User;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Requerimentos\Models\Anexo;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\Resposta;
use Throwable;

/**
 * Upload e descarte de anexos (PDF/imagem) de qualquer entidade `anexavel`
 * do módulo (hoje: Proposicao e Resposta). Mesmo padrão de disco privado +
 * nome aleatório + checagem de MIME real do `Modules\Cursos\Services\MaterialService`.
 */
final class AnexoService
{
    public const DISCO = 'local';

    public const MIMES_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];

    public const TAMANHO_MAXIMO_KB = 20480;

    public function anexar(Proposicao|Resposta $anexavel, UploadedFile $arquivo, User $uploader): Anexo
    {
        $tenantId = $anexavel->tenant_id;
        $tipoSlug = Str::snake(class_basename($anexavel));
        $extensao = $arquivo->getClientOriginalExtension();
        $nomeArmazenado = Str::uuid()->toString() . ($extensao !== '' ? ".{$extensao}" : '');
        $caminho = "requerimentos/{$tenantId}/{$tipoSlug}/{$anexavel->getKey()}/{$nomeArmazenado}";

        $conteudo = file_get_contents($arquivo->getRealPath());
        if ($conteudo === false) {
            throw new DomainException('Não foi possível ler o arquivo enviado.');
        }

        if (! Storage::disk(self::DISCO)->put($caminho, $conteudo)) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        try {
            /** @var Anexo $anexo */
            $anexo = $anexavel->anexos()->create([
                'tenant_id'         => $tenantId,
                'nome_arquivo'      => Str::limit(basename($arquivo->getClientOriginalName()), 250, ''),
                'url_armazenamento' => $caminho,
                'hash_sha256'       => hash('sha256', $conteudo),
                'mime_type'         => (string) $arquivo->getMimeType(),
                'tamanho_bytes'     => $arquivo->getSize(),
                'uploaded_by'       => $uploader->id,
            ]);
        } catch (Throwable $e) {
            Storage::disk(self::DISCO)->delete($caminho);

            throw $e;
        }

        return $anexo;
    }

    public function excluir(Anexo $anexo): void
    {
        $caminho = $anexo->url_armazenamento;
        $anexo->delete();
        Storage::disk(self::DISCO)->delete($caminho);
    }
}
