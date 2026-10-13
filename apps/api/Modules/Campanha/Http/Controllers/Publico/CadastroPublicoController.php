<?php

declare(strict_types=1);

namespace Modules\Campanha\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Campanha\Services\CadastroPublicoService;

/**
 * Formulário público de captação de eleitores — sem login e sem TenantContext.
 * Só pode depender do CadastroPublicoService (teste de arquitetura).
 */
final class CadastroPublicoController extends Controller
{
    public function __construct(
        private readonly CadastroPublicoService $cadastro,
    ) {}

    public function formulario(string $codigo): JsonResponse
    {
        $formulario = $this->cadastro->formulario($codigo);

        return $formulario === null
            ? response()->json(['encontrado' => false, 'mensagem' => 'Link de cadastro não encontrado. Confira o endereço.'], 404)
            : response()->json(['encontrado' => true, ...$formulario]);
    }

    public function cadastrar(Request $request, string $codigo): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'min:3', 'max:200'],
            'codigo_ibge' => ['required', 'integer'],
            'bairro' => ['required', 'string', 'max:150'],
            'zona' => ['nullable', 'integer', 'between:1,9999'],
            'secao' => ['nullable', 'integer', 'between:1,9999'],
            'whatsapp' => ['nullable', 'string', 'regex:/^[\d\s()+-]{10,20}$/'],
            'data_nascimento' => ['nullable', 'date', 'before:today', 'after:1900-01-01'],
            'demanda' => ['nullable', 'string', 'max:2000'],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'precisao_m' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'aceite' => ['accepted'],
            'iniciado_em' => ['required', 'string', 'max:100'],
            'site' => ['nullable', 'string', 'max:200'],
        ], [
            'aceite.accepted' => 'Para enviar, marque que leu e aceita o termo de privacidade.',
            'whatsapp.regex' => 'Informe o WhatsApp com DDD.',
        ]);

        try {
            return response()->json($this->cadastro->cadastrar($codigo, $dados, $request->ip(), $request->userAgent()), 201);
        } catch (DomainException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
}
