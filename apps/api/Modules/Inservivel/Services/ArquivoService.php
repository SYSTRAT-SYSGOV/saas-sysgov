<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Support\TenantContext;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Arquivos do módulo em disco privado (D12): caminho por tenant e recurso, nome gerado e só servidos pela API depois
 * que a policy do objeto autoriza. Nenhuma rota aceita caminho vindo da requisição.
 */
final class ArquivoService
{
    public const DISCO = 'local';

    /** Fotos de bem: JPEG, PNG ou WebP até 5 MB. */
    public const REGRA_FOTO = ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'];

    /** Documentos (entidade e lote): PDF, JPEG ou PNG. */
    public const REGRA_DOCUMENTO_ENTIDADE = ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];

    public const REGRA_DOCUMENTO_LOTE = ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'];

    public function __construct(
        private readonly TenantContext $tenant,
    ) {}

    /** @return array{caminho: string, mime: string} */
    public function guardar(UploadedFile $arquivo, string $recurso): array
    {
        $extensao = strtolower($arquivo->guessExtension() ?? $arquivo->getClientOriginalExtension());
        $pasta = sprintf('inservivel/%d/%s', $this->tenant->id(), $recurso);
        $caminho = $arquivo->storeAs($pasta, Str::uuid()->toString() . '.' . $extensao, self::DISCO);
        if ($caminho === false) {
            throw new DomainException('Não foi possível gravar o arquivo. Tente novamente.');
        }

        return ['caminho' => $caminho, 'mime' => (string) ($arquivo->getMimeType() ?? 'application/octet-stream')];
    }

    /** Grava um conteúdo gerado pelo sistema (ex.: PDF do relatório do sorteio). */
    public function guardarConteudo(string $conteudo, string $recurso, string $extensao): string
    {
        $caminho = sprintf('inservivel/%d/%s/%s.%s', $this->tenant->id(), $recurso, Str::uuid()->toString(), $extensao);
        if (!Storage::disk(self::DISCO)->put($caminho, $conteudo)) {
            throw new DomainException('Não foi possível gravar o arquivo gerado.');
        }

        return $caminho;
    }

    public function apagar(?string $caminho): void
    {
        if ($caminho !== null && $caminho !== '') {
            Storage::disk(self::DISCO)->delete($caminho);
        }
    }

    public function resposta(string $caminho, string $mime, string $nome): ?StreamedResponse
    {
        $disco = Storage::disk(self::DISCO);
        if (!$disco->exists($caminho)) {
            return null;
        }
        $extensao = pathinfo($caminho, PATHINFO_EXTENSION);

        return $disco->response($caminho, Str::slug($nome) . '.' . $extensao, ['Content-Type' => $mime, 'X-Content-Type-Options' => 'nosniff'], 'inline');
    }
}
