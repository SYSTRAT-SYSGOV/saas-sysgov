<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use App\Support\AtributosDinamicos\TipoAtributo;
use App\Support\AtributosDinamicos\ValidadorAtributo;
use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use InvalidArgumentException;
use Modules\Protocolo\Models\Atributo;
use Modules\Protocolo\Models\Processo;

final class StoreAtributoRequest extends FormRequest
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
        return [
            'chave' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_-]+$/'],
            'tipo_atributo' => ['required', 'string', Rule::in(TipoAtributo::values())],
            'valor' => ['required'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $routeProcesso = $this->route('processo');
            $processoId = $routeProcesso instanceof Processo
                ? (int) $routeProcesso->id
                : (int) $routeProcesso;

            if ($processoId <= 0) {
                $segments = $this->segments();
                // /api/protocolo/processos/{id}/atributos
                foreach ($segments as $i => $seg) {
                    if ($seg === 'processos' && isset($segments[$i + 1]) && is_numeric($segments[$i + 1])) {
                        $processoId = (int) $segments[$i + 1];
                        break;
                    }
                }
            }

            $chave = (string) $this->input('chave');
            $tenantId = app(TenantContext::class)->id();

            // Valida chave duplicada para o mesmo processo
            if ($processoId > 0 && !empty($chave)) {
                $jaExiste = Atributo::query()
                    ->where('tenant_id', $tenantId)
                    ->where('processo_id', $processoId)
                    ->where('chave', $chave)
                    ->exists();

                if ($jaExiste) {
                    $v->errors()->add('chave', "O atributo com a chave '{$chave}' já existe neste processo.");
                }
            }

            // Valida tipo e valor
            $tipo = (string) $this->input('tipo_atributo');
            $valor = $this->input('valor');

            if (in_array($tipo, TipoAtributo::values(), true)) {
                try {
                    ValidadorAtributo::validar($tipo, $valor);
                } catch (InvalidArgumentException $e) {
                    $v->errors()->add('valor', $e->getMessage());
                }
            }
        });
    }
}
