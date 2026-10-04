<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Pessoas\Models\Pessoa;

/**
 * @mixin Pessoa
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        if ($request->boolean('compact')) {
            return [
                'id' => $this->id,
                'nome' => $this->nome,
                'nome_social' => $this->nome_social,
                'cpf_mascarado' => $this->cpf_mascarado,
                'status' => $this->status,
                'falecido' => (bool) $this->falecido,
                'data_falecimento' => $this->data_falecimento?->format('Y-m-d'),
            ];
        }

        $user = $request->user();
        $podeVerSensivel = $user !== null && (
            (bool) $user->getAttribute('is_platform_admin')
            || $user->can('viewSensitive', $this->resource)
        );

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'nome' => $this->nome,
            'nome_social' => $this->nome_social,
            'cpf_mascarado' => $this->cpf_mascarado,
            'pode_desmascarar' => $podeVerSensivel,
            'cpf_desmascarado' => $this->when($podeVerSensivel && $request->boolean('reveal_sensitive'), fn () => (string) $this->cpf),
            'data_nascimento' => $this->data_nascimento?->format('Y-m-d'),
            'sexo' => $this->sexo,
            'nome_mae' => $this->nome_mae,
            'nome_pai' => $this->nome_pai,
            'estado_civil' => $this->estado_civil,
            'nacionalidade' => $this->nacionalidade,
            'naturalidade' => $this->naturalidade,
            'nis' => $this->nis,
            'status' => $this->status,
            'falecido' => (bool) $this->falecido,
            'data_falecimento' => $this->data_falecimento?->format('Y-m-d'),
            'certidao_obito_numero' => $this->certidao_obito_numero,
            'cartorio_obito' => $this->cartorio_obito,
            'observacao_obito' => $this->observacao_obito,
            'vinculos' => PessoaVinculoResource::collection($this->whenLoaded('vinculos')),
            'documentos' => PessoaDocumentoResource::collection($this->whenLoaded('documentos')),
            'enderecos' => PessoaEnderecoResource::collection($this->whenLoaded('enderecos')),
            'contatos' => PessoaContatoResource::collection($this->whenLoaded('contatos')),
            'usuario' => $this->whenLoaded('usuario', fn () => $this->usuario ? [
                'id' => $this->usuario->id,
                'user_id' => $this->usuario->user_id,
                'promovido_em' => $this->usuario->promovido_em->toISOString(),
                'promovido_por' => $this->usuario->promovido_por,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
