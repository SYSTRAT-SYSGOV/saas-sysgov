<?php

declare(strict_types=1);

namespace Modules\Ata\Services;

use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Arquivos do módulo em disco privado, por tenant: timbrados, assinaturas e PDFs finalizados. Caminho e nome são
 * gerados aqui; nenhuma rota aceita caminho vindo da requisição e tudo é servido pela API depois da policy.
 */
final class ArquivoAtaService
{
    public const DISCO = 'local';

    public const REGRA_TIMBRADO = ['required', 'file', 'mimes:jpg,jpeg,png', 'max:4096'];

    public function __construct(
        private readonly TenantContext $tenant,
    ) {}

    /** @return array{caminho: string, mime: string} */
    public function guardarUpload(UploadedFile $arquivo, string $recurso): array
    {
        $extensao = strtolower($arquivo->guessExtension() ?? $arquivo->getClientOriginalExtension());
        $caminho = $arquivo->storeAs($this->pasta($recurso), Str::uuid()->toString() . '.' . $extensao, self::DISCO);
        if ($caminho === false) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        return ['caminho' => $caminho, 'mime' => (string) ($arquivo->getMimeType() ?? 'application/octet-stream')];
    }

    public function guardarConteudo(string $conteudo, string $recurso, string $extensao): string
    {
        $caminho = $this->pasta($recurso) . '/' . Str::uuid()->toString() . '.' . $extensao;
        if (!Storage::disk(self::DISCO)->put($caminho, $conteudo)) {
            throw new DomainException('Não foi possível gravar o arquivo gerado.');
        }

        return $caminho;
    }

    public function ler(?string $caminho): ?string
    {
        if ($caminho === null || $caminho === '' || !Storage::disk(self::DISCO)->exists($caminho)) {
            return null;
        }

        return Storage::disk(self::DISCO)->get($caminho);
    }

    /** data URI para embutir imagens no PDF (o dompdf roda sem acesso remoto). */
    public function dataUri(?string $caminho, string $mime): ?string
    {
        $conteudo = $this->ler($caminho);

        return $conteudo === null ? null : 'data:' . $mime . ';base64,' . base64_encode($conteudo);
    }

    public function apagar(?string $caminho): void
    {
        if ($caminho !== null && $caminho !== '') {
            Storage::disk(self::DISCO)->delete($caminho);
        }
    }

    public function resposta(string $caminho, string $mime, string $nome, bool $baixar = false): ?StreamedResponse
    {
        $disco = Storage::disk(self::DISCO);
        if (!$disco->exists($caminho)) {
            return null;
        }
        $extensao = pathinfo($caminho, PATHINFO_EXTENSION);

        return $disco->response($caminho, Str::slug($nome) . '.' . $extensao, ['Content-Type' => $mime, 'X-Content-Type-Options' => 'nosniff'], $baixar ? 'attachment' : 'inline');
    }

    private function pasta(string $recurso): string
    {
        return sprintf('ata/%d/%s', $this->tenant->id(), $recurso);
    }
}
