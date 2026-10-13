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

final class StoreProcessoRequest extends FormRequest
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
            'assunto' => ['required', 'string', 'max:500'],
            'origem' => ['required', 'string', 'in:externa,interna'],
            'orgao_origem_id' => [
                'required',
                'integer',
                Rule::exists('org_units', 'id')->where('tenant_id', $tenantId),
            ],
            'orgao_atual_id' => [
                'nullable',
                'integer',
                Rule::exists('org_units', 'id')->where('tenant_id', $tenantId),
            ],
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
            'data_abertura' => ['nullable', 'date'],
            'atributos' => ['nullable', 'array'],
            'atributos.*.chave' => ['required_with:atributos', 'string', 'max:100'],
            'atributos.*.tipo_atributo' => ['required_with:atributos', 'string', Rule::in(TipoAtributo::values())],
            'atributos.*.valor' => ['required_with:atributos'],
            'documentos' => ['nullable', 'array'],
            'documentos.*.tipo_documento' => ['required_with:documentos', 'string', 'max:64'],
            'documentos.*.arquivo' => ['required_with:documentos', 'file', 'max:20480', 'mimes:pdf,png,jpg,jpeg,docx,odt,xlsx'],
            'documentos.*.nome_arquivo' => ['nullable', 'string', 'max:255'],
            'andamento_inicial' => ['nullable', 'array'],
            'andamento_inicial.descricao' => ['nullable', 'string', 'max:1000'],
            'andamento_inicial.tipo_tramitacao_id' => [
                'nullable',
                'integer',
                Rule::exists('protocolo_tipos_tramitacao', 'id')->where('tenant_id', $tenantId),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            // Ignora explicitamente campo 'numero' enviado pelo cliente
            $this->request->remove('numero');

            $atributos = $this->input('atributos');
            if (is_array($atributos)) {
                $chaves = [];
                foreach ($atributos as $i => $attr) {
                    if (!isset($attr['chave'], $attr['tipo_atributo'], $attr['valor'])) {
                        continue;
                    }
                    $chave = (string) $attr['chave'];
                    if (in_array($chave, $chaves, true)) {
                        $v->errors()->add("atributos.{$i}.chave", "A chave de atributo '{$chave}' não pode ser duplicada.");
                    }
                    $chaves[] = $chave;

                    try {
                        ValidadorAtributo::validar($attr['tipo_atributo'], $attr['valor']);
                    } catch (InvalidArgumentException $e) {
                        $v->errors()->add("atributos.{$i}.valor", $e->getMessage());
                    }
                }
            }
        });
    }
}
