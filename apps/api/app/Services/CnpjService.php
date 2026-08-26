<?php

declare(strict_types=1);

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;

final readonly class CnpjService
{
    private Client $http;

    public function __construct()
    {
        $this->http = new Client(['http_errors' => false, 'timeout' => 10]);
    }

    /**
     * Consulta os dados da empresa/órgão pelo CNPJ (BrasilAPI, sem chave).
     *
     * @return array<string, mixed>|null null se CNPJ inválido ou não encontrado
     */
    public function lookup(string $cnpj): ?array
    {
        $digits = preg_replace('/\D/', '', $cnpj) ?? '';

        if (strlen($digits) !== 14) {
            return null;
        }

        return Cache::remember("cnpj:{$digits}", 3600, function () use ($digits): ?array {
            try {
                $response = $this->http->get("https://brasilapi.com.br/api/cnpj/v1/{$digits}");
            } catch (\Throwable) {
                return null;
            }

            if ($response->getStatusCode() !== 200) {
                return null;
            }

            $data = json_decode((string) $response->getBody(), true);

            if (!is_array($data)) {
                return null;
            }

            return [
                'cnpj' => $digits,
                'razao_social' => $data['razao_social'] ?? null,
                'nome_fantasia' => $data['nome_fantasia'] ?? null,
                'municipio' => $data['municipio'] ?? null,
                'uf' => $data['uf'] ?? null,
                'cnae_fiscal' => $data['cnae_fiscal'] ?? null,
                'cnae_fiscal_descricao' => $data['cnae_fiscal_descricao'] ?? null,
                'telefone' => $data['ddd_telefone_1'] ?? null,
                'email' => $data['email'] ?? null,
                'porte' => $data['porte'] ?? null,
                'natureza_juridica' => $data['natureza_juridica'] ?? null,
            ];
        });
    }
}
