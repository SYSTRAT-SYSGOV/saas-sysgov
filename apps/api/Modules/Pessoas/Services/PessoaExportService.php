<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\Pessoas\Models\Pessoa;

/** Exportação self-service do cadastro de pessoas (JSON com manifest versionado, ou CSV), sempre auditada. */
final readonly class PessoaExportService
{
    public function __construct(
        private TenantContext $tenantContext,
        private AuditLogger $audit,
    ) {}

    /**
     * @return array{manifest: array<string, mixed>, pessoas: array<int, array<string, mixed>>}
     */
    public function exportJson(): array
    {
        $tenant = $this->tenantContext->get();
        $pessoas = Pessoa::query()->with(['vinculos', 'documentos', 'enderecos', 'contatos'])->orderBy('nome')->get();

        $flat = [];
        foreach ($pessoas as $p) {
            $flat[] = $this->pessoaParaExport($p);
        }

        $manifest = [
            'version' => '1.0.0',
            'schema' => 'sysgov_pessoas',
            'tenant_id' => $tenant->id,
            'tenant_slug' => $tenant->slug,
            'tenant_name' => $tenant->name,
            'generated_at' => now()->toISOString(),
            'total_pessoas' => count($flat),
            'checksum_sha256' => hash('sha256', json_encode($flat) ?: ''),
        ];

        $this->audit->record('pessoas', 'pessoa.exported_json', "Tenant #{$tenant->id} ({$tenant->name})", null, ['total_pessoas' => count($flat)]);

        return ['manifest' => $manifest, 'pessoas' => $flat];
    }

    public function exportCsv(): string
    {
        $tenant = $this->tenantContext->get();
        $pessoas = Pessoa::query()->orderBy('nome')->get();

        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            return '';
        }

        fwrite($handle, "\xEF\xBB\xBF");
        fputcsv($handle, ['ID', 'Nome', 'Nome_Social', 'CPF', 'Data_Nascimento', 'Status'], ';');

        foreach ($pessoas as $pessoa) {
            fputcsv($handle, [
                $pessoa->id,
                $pessoa->nome,
                $pessoa->nome_social ?? '',
                $pessoa->cpf,
                $pessoa->data_nascimento?->format('d/m/Y') ?? '',
                $pessoa->status,
            ], ';');
        }

        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);

        $this->audit->record('pessoas', 'pessoa.exported_csv', "Tenant #{$tenant->id} ({$tenant->name})", null, ['total_pessoas' => $pessoas->count()]);

        return $csv;
    }

    /** @return array<string, mixed> */
    private function pessoaParaExport(Pessoa $p): array
    {
        return [
            'id' => $p->id,
            'nome' => $p->nome,
            'nome_social' => $p->nome_social,
            'cpf' => $p->cpf,
            'data_nascimento' => $p->data_nascimento?->toDateString(),
            'sexo' => $p->sexo,
            'estado_civil' => $p->estado_civil,
            'nacionalidade' => $p->nacionalidade,
            'naturalidade' => $p->naturalidade,
            'status' => $p->status,
            'vinculos' => $p->vinculos->map(fn ($v) => ['tipo_vinculo' => $v->tipo_vinculo, 'inicio' => $v->inicio?->toDateString(), 'fim' => $v->fim?->toDateString()])->all(),
            'documentos' => $p->documentos->map(fn ($d) => ['tipo' => $d->tipo, 'numero' => $d->numero, 'orgao_emissor' => $d->orgao_emissor])->all(),
            'enderecos' => $p->enderecos->map(fn ($e) => $e->only(['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'tipo_endereco']))->all(),
            'contatos' => $p->contatos->map(fn ($c) => ['tipo' => $c->tipo, 'valor' => $c->valor, 'principal' => $c->principal])->all(),
        ];
    }
}
