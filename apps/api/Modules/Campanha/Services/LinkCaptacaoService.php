<?php

declare(strict_types=1);

namespace Modules\Campanha\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use chillerlan\QRCode\Output\QRMarkupSVG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\CaboEleitoral;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\LinkCaptacao;
use Modules\Campanha\Services\Concerns\RegistraMutacao;

/** Links de captação da campanha de trabalho: responsável da própria campanha, ativação e QR Code (D1, D8). */
final class LinkCaptacaoService
{
    use RegistraMutacao;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    /** @param array<string, mixed> $dados tipo, coordenador_id|cabo_id, descricao */
    public function criar(array $dados): LinkCaptacao
    {
        $tipo = (string) $dados['tipo'];
        $campo = $tipo === 'coordenador' ? 'coordenador_id' : 'cabo_id';
        $id = (int) ($dados[$campo] ?? 0);
        // Coordenador e cabo são CampanhaAware: o de outra campanha (ou outro tenant) não é encontrado.
        $existe = $tipo === 'coordenador'
            ? Coordenador::query()->whereKey($id)->exists()
            : CaboEleitoral::query()->whereKey($id)->exists();
        if (!$existe) {
            throw new DomainException($tipo === 'coordenador' ? 'Coordenador não encontrado nesta campanha.' : 'Cabo eleitoral não encontrado nesta campanha.');
        }

        return DB::transaction(function () use ($tipo, $campo, $id, $dados): LinkCaptacao {
            $link = LinkCaptacao::create(['tipo' => $tipo, $campo => $id, 'descricao' => $dados['descricao'] ?? null]);
            $this->auditar('link', 'criado', $link->id, null, $link->toArray());

            return $link;
        });
    }

    /** @param array<string, mixed> $dados ativo, descricao */
    public function atualizar(LinkCaptacao $link, array $dados): LinkCaptacao
    {
        return DB::transaction(function () use ($link, $dados): LinkCaptacao {
            $antes = $link->toArray();
            $link->update(array_intersect_key($dados, array_flip(['ativo', 'descricao'])));
            $this->auditar('link', 'atualizado', $link->id, $antes, $link->toArray());

            return $link;
        });
    }

    /** Link que já captou eleitores não sai (é a origem do cadastro): só pode ser desativado. */
    public function excluir(LinkCaptacao $link): void
    {
        if ($link->eleitores()->exists()) {
            throw new DomainException('Este link já captou eleitores: desative-o em vez de excluir.');
        }
        DB::transaction(function () use ($link): void {
            $antes = $link->toArray();
            $link->delete();
            $this->auditar('link', 'excluido', $link->id, $antes, null);
        });
    }

    /** QR Code da URL pública do formulário, em SVG. */
    public function qrcode(LinkCaptacao $link): string
    {
        return (new QRCode(new QROptions(['outputInterface' => QRMarkupSVG::class, 'outputBase64' => false])))->render($link->url());
    }
}
