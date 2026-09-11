<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use DomainException;
use Modules\Licita\Models\CampoConfiguracao;

final class CampoConfiguracaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenantContext,
    ) {}

    public function getAtiva(string $tipoDocumento): ?CampoConfiguracao
    {
        if (!$this->tenantContext->hasTenant()) {
            return null;
        }

        return CampoConfiguracao::query()
            ->where('tipo_documento', $tipoDocumento)
            ->where('ativo', true)
            ->first();
    }

    /**
     * @param array<int, array{key: string, label: string, tipo: string, opcoes?: array<int, string>, obrigatorio: bool, ordem: int, ajuda?: string, aba?: string}> $campos
     */
    public function salvar(string $tipoDocumento, array $campos): CampoConfiguracao
    {
        $this->validarSchema($campos);

        $configuracao = CampoConfiguracao::query()->updateOrCreate(
            ['tenant_id' => $this->tenantContext->id(), 'tipo_documento' => $tipoDocumento],
            ['campos' => $campos, 'ativo' => true]
        );

        $this->audit->record('licita', 'campo_configuracao.salvo', "CampoConfiguracao#{$tipoDocumento}", null, $configuracao->toArray());

        return $configuracao;
    }

    /**
     * Valida as respostas (campos_extras) de um documento contra a
     * configuração ativa do tenant para aquele tipo — lança DomainException
     * listando os campos obrigatórios faltando, no mesmo padrão usado para
     * os campos fixos dos artefatos (ex.: DfdService).
     *
     * @param array<string, mixed> $respostas
     */
    public function validarRespostas(string $tipoDocumento, array $respostas): void
    {
        $configuracao = $this->getAtiva($tipoDocumento);
        if ($configuracao === null) {
            return;
        }

        $faltando = [];
        foreach ($configuracao->campos as $campo) {
            if (!$campo['obrigatorio']) {
                continue;
            }

            $valor = $respostas[$campo['key']] ?? null;
            if ($valor === null || $valor === '') {
                $faltando[] = $campo['label'];
            }
        }

        if ($faltando !== []) {
            throw new DomainException(
                'Campos obrigatórios não preenchidos: ' . implode(', ', $faltando) . '.'
            );
        }
    }

    /**
     * @param array<int, array{key?: mixed, label?: mixed, tipo?: mixed, obrigatorio?: mixed}> $campos
     */
    private function validarSchema(array $campos): void
    {
        $tiposValidos = ['texto', 'texto_longo', 'numero', 'data', 'booleano', 'selecao'];
        $chaves = [];

        foreach ($campos as $campo) {
            $key = $campo['key'] ?? null;
            if (!is_string($key) || $key === '') {
                throw new DomainException('Todo campo precisa de uma chave (key) válida.');
            }
            if (in_array($key, $chaves, true)) {
                throw new DomainException("Chave de campo duplicada: {$key}.");
            }
            $chaves[] = $key;

            if (!is_string($campo['label'] ?? null) || $campo['label'] === '') {
                throw new DomainException("O campo '{$key}' precisa de um rótulo (label).");
            }

            if (!in_array($campo['tipo'] ?? null, $tiposValidos, true)) {
                throw new DomainException("Tipo inválido para o campo '{$key}'.");
            }
        }
    }
}
