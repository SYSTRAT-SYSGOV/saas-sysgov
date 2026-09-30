<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services\Adapters;

use Illuminate\Support\Facades\Http;
use Modules\Pessoas\Contracts\PessoaImportAdapterInterface;
use Modules\Pessoas\Models\PessoaIntegracao;
use RuntimeException;

/** Adapter HTTP genérico e configurável (driver `generic_rest`) — sem contrato fixo por sistema da prefeitura. */
final class GenericHttpPessoaImportAdapter implements PessoaImportAdapterInterface
{
    public function __construct(private readonly PessoaIntegracao $integracao) {}

    public function buscarPorCpf(string $cpfLimpo): ?array
    {
        if (empty($this->integracao->api_url)) {
            throw new RuntimeException('Integração de importação de pessoas não configurada: api_url ausente.');
        }

        $request = $this->integracao->api_token ? Http::withToken($this->integracao->api_token) : Http::asJson();
        $response = $request->timeout(10)->get($this->integracao->api_url, ['cpf' => $cpfLimpo]);

        if ($response->status() === 404) {
            return null;
        }
        if (!$response->successful()) {
            throw new RuntimeException('Falha ao consultar o sistema da prefeitura: ' . $response->body());
        }

        $corpo = $response->json();
        $mapeamento = $this->integracao->field_mappings ?? [];
        $campo = fn (string $nossoCampo, string $padrao) => data_get($corpo, $mapeamento[$nossoCampo] ?? $padrao);

        return array_filter([
            'cpf' => $cpfLimpo,
            'nome' => $campo('nome', 'nome'),
            'nome_social' => $campo('nome_social', 'nome_social'),
            'data_nascimento' => $campo('data_nascimento', 'data_nascimento'),
            'sexo' => $campo('sexo', 'sexo'),
            'nome_mae' => $campo('nome_mae', 'nome_mae'),
            'nome_pai' => $campo('nome_pai', 'nome_pai'),
            'estado_civil' => $campo('estado_civil', 'estado_civil'),
            'nacionalidade' => $campo('nacionalidade', 'nacionalidade'),
            'naturalidade' => $campo('naturalidade', 'naturalidade'),
            'nis' => $campo('nis', 'nis'),
        ], fn ($valor) => $valor !== null);
    }
}
