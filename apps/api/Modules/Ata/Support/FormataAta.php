<?php

declare(strict_types=1);

namespace Modules\Ata\Support;

use Modules\Ata\Models\Ata;
use Modules\Ata\Models\AtaParticipante;

/** Saída JSON da ata. Sigilosa sem acesso sai mascarada: sem título, texto nem participantes. */
final class FormataAta
{
    /** @return array<string, mixed> */
    public static function item(Ata $ata, bool $podeAbrir): array
    {
        $base = [
            'id' => $ata->id,
            'numero' => $ata->numeroFormatado(),
            'secretaria' => ['id' => $ata->org_unit_id, 'nome' => $ata->secretaria?->name],
            'sigilosa' => $ata->sigilosa,
            'status' => $ata->status->value,
            'status_rotulo' => $ata->status->rotulo(),
            'pode_abrir' => $podeAbrir,
            'criado_em' => $ata->created_at?->toIso8601String(),
        ];
        if (!$podeAbrir) {
            return [...$base, 'titulo' => 'Ata sigilosa', 'tipo' => null, 'data_reuniao' => null, 'autor' => null, 'assinaturas' => null];
        }
        $participantes = $ata->relationLoaded('participantes') ? $ata->participantes : $ata->participantes()->get();

        return [
            ...$base,
            'titulo' => $ata->titulo,
            'tipo' => $ata->tipo ? ['id' => $ata->tipo->id, 'nome' => $ata->tipo->nome] : null,
            'data_reuniao' => $ata->data_reuniao->format('Y-m-d\TH:i'),
            'autor' => $ata->autor?->name,
            'assinaturas' => ['feitas' => $participantes->whereNotNull('assinado_em')->count(), 'total' => $participantes->count()],
        ];
    }

    /** @return array<string, mixed> */
    public static function detalhe(Ata $ata, bool $iaDisponivel): array
    {
        $ata->loadMissing(['secretaria', 'tipo', 'autor', 'participantes']);

        return [
            ...self::item($ata, true),
            'local' => $ata->local,
            'cidade' => $ata->cidade,
            'redator' => $ata->redator,
            'conteudo_html' => $ata->conteudo_html,
            'codigo_validacao' => $ata->codigo_validacao,
            'tem_pdf' => $ata->pdf_path !== null,
            'rascunho_em' => $ata->rascunho_em?->toIso8601String(),
            'finalizada_em' => $ata->finalizada_em?->toIso8601String(),
            'editavel' => $ata->status->editavel(),
            'aceita_assinatura' => $ata->status->aceitaAssinatura(),
            'ia_disponivel' => $iaDisponivel,
            'participantes' => $ata->participantes->map(fn (AtaParticipante $p): array => [
                'id' => $p->id,
                'pessoa_id' => $p->pessoa_id,
                'nome' => $p->nome,
                'cargo' => $p->cargo,
                'assinou' => $p->assinou(),
                'assinado_em' => $p->assinado_em?->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
