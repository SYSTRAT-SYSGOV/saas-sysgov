<?php

declare(strict_types=1);

namespace Modules\Portfolio\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Modules\Portfolio\Models\Imagem;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\Concerns\RegistraMutacao;

/**
 * Evidências em imagem (design D4): a tela já envia JPEG reduzido; aqui a imagem é reduzida de novo por
 * segurança e guardada sempre em JPEG no disco privado.
 */
final class ImagemService
{
    use RegistraMutacao;

    public const LIMITE = 6;

    public const LADO_MAXIMO = 1600;

    /** Acima disso a decodificação pela GD estoura a memória do PHP (≈ 4 bytes por pixel). */
    public const MAXIMO_PIXELS = 40_000_000;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    public function adicionar(Trabalho $trabalho, UploadedFile $arquivo): Imagem
    {
        if ($trabalho->imagens()->count() >= self::LIMITE) {
            throw ValidationException::withMessages(['imagem' => 'Cada trabalho aceita no máximo ' . self::LIMITE . ' imagens.']);
        }
        try {
            $jpeg = self::emJpeg((string) file_get_contents((string) $arquivo->getRealPath()), self::LADO_MAXIMO);
        } catch (DomainException $e) {
            throw ValidationException::withMessages(['imagem' => $e->getMessage()]);
        }
        $caminho = "portfolio/{$trabalho->tenant_id}/trabalhos/{$trabalho->id}/" . Str::uuid()->toString() . '.jpg';

        return DB::transaction(function () use ($trabalho, $arquivo, $jpeg, $caminho): Imagem {
            Storage::disk(TrabalhoService::DISCO)->put($caminho, $jpeg);
            $imagem = Imagem::create([
                'trabalho_id' => $trabalho->id,
                'path' => $caminho,
                'nome_original' => Str::limit($arquivo->getClientOriginalName(), 250, ''),
                'mime' => 'image/jpeg',
                'tamanho' => strlen($jpeg),
                'ordem' => (int) $trabalho->imagens()->max('ordem') + 1,
            ]);
            $this->auditar('imagem', 'adicionada', $imagem->id, null, $imagem->toArray(), ['trabalho_id' => $trabalho->id]);

            return $imagem;
        });
    }

    public function remover(Imagem $imagem): void
    {
        DB::transaction(function () use ($imagem): void {
            $antes = $imagem->toArray();
            $caminho = $imagem->path;
            $imagem->delete();
            $this->auditar('imagem', 'removida', $imagem->id, $antes, null, ['trabalho_id' => $imagem->trabalho_id]);
            DB::afterCommit(fn () => Storage::disk(TrabalhoService::DISCO)->delete($caminho));
        });
    }

    /**
     * JPEG com o lado maior limitado; transparência achatada sobre branco. Mesmo molde do
     * ModeloCertificadoService::fundoEmJpeg (o dompdf embute JPEG sem decodificar).
     */
    public static function emJpeg(string $conteudo, int $ladoMaximo, int $qualidade = 85): string
    {
        $info = @getimagesizefromstring($conteudo);
        if ($info !== false && $info[0] * $info[1] > self::MAXIMO_PIXELS) {
            throw new DomainException('A imagem tem resolução grande demais (máximo de 40 megapixels).');
        }
        $origem = $info === false ? false : @imagecreatefromstring($conteudo);
        if ($info === false || $origem === false) {
            throw new DomainException('Não foi possível ler a imagem. Envie um arquivo JPG ou PNG.');
        }
        $escala = min(1, $ladoMaximo / max($info[0], $info[1]));
        $largura = max(1, (int) round($info[0] * $escala));
        $altura = max(1, (int) round($info[1] * $escala));
        $destino = imagecreatetruecolor($largura, $altura);
        imagefill($destino, 0, 0, (int) imagecolorallocate($destino, 255, 255, 255));
        imagecopyresampled($destino, $origem, 0, 0, 0, 0, $largura, $altura, $info[0], $info[1]);

        ob_start();
        imagejpeg($destino, null, $qualidade);

        return (string) ob_get_clean();
    }
}
