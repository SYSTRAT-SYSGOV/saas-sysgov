<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Protocolo\Models\Processo;

final class UpdateProcessoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'assunto' => ['sometimes', 'string', 'max:500'],
            'interessado_pessoa_id' => [
                'nullable',
                'integer',
                Rule::exists('pessoas', 'id')->where('tenant_id', $tenantId),
            ],
            'processo_pai_id' => [
                'nullable',
                'integer',
                Rule::exists('protocolo_processos', 'id')->where('tenant_id', $tenantId),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $routeProcesso = $this->route('processo') ?? $this->route('id');
            $processoId = 0;

            if ($routeProcesso instanceof Processo) {
                $processoId = (int) $routeProcesso->id;
            } elseif (is_numeric($routeProcesso)) {
                $processoId = (int) $routeProcesso;
            } else {
                $segments = $this->segments();
                $lastSegment = end($segments);
                if (is_numeric($lastSegment)) {
                    $processoId = (int) $lastSegment;
                }
            }

            $candidatoPaiId = $this->input('processo_pai_id');

            if ($candidatoPaiId !== null && $processoId > 0) {
                $candidatoPaiId = (int) $candidatoPaiId;
                if ($this->detectaCiclo($processoId, $candidatoPaiId)) {
                    $v->errors()->add('processo_pai_id', 'Não é permitido criar um ciclo na hierarquia pai-filho.');
                }
            }
        });
    }

    private function detectaCiclo(int $processoId, int $candidatoPaiId): bool
    {
        if ($processoId === $candidatoPaiId) {
            return true;
        }

        $tenantId = app(TenantContext::class)->id();
        $atualId = $candidatoPaiId;
        $visitados = [];

        while ($atualId !== null && $atualId > 0) {
            if ($atualId === $processoId) {
                return true;
            }

            if (in_array($atualId, $visitados, true)) {
                break;
            }
            $visitados[] = $atualId;

            $pai = Processo::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('id', $atualId)
                ->value('processo_pai_id');

            $atualId = $pai !== null ? (int) $pai : null;
        }

        return false;
    }
}
