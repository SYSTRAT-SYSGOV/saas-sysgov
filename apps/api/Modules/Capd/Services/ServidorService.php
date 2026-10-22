<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\TenantContext;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Capd\Models\Servidor;

final class ServidorService
{
    public function __construct(private readonly ServidorPessoaService $pessoas) {}

    /**
     * @param array<string, mixed> $filters
     */
    public function list(array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $tenantId = (int) app(TenantContext::class)->id();

        return Servidor::query()
            ->where('tenant_id', $tenantId)
            ->when(!empty($filters['search']), function ($q) use ($filters): void {
                $search = '%' . $filters['search'] . '%';
                $q->where(function ($sub) use ($search, $filters): void {
                    $sub->where('nome_completo', 'like', $search)
                        ->orWhere('matricula', 'like', $search)
                        ->orWhere(fn ($c) => $c->comCpf((string) $filters['search']))
                        ->orWhere('cargo_efetivo', 'like', $search)
                        ->orWhere('orgao_lotacao', 'like', $search);
                });
            })
            ->when(!empty($filters['situacao']), fn ($q) => $q->where('situacao_funcional', $filters['situacao']))
            ->when(isset($filters['estagio_probatorio']), fn ($q) => $q->where('estagio_probatorio', (bool) $filters['estagio_probatorio']))
            ->when(!empty($filters['orgao_lotacao']), fn ($q) => $q->where('orgao_lotacao', $filters['orgao_lotacao']))
            ->when(isset($filters['chefia_imediata_id']), fn ($q) => $q->where('chefia_imediata_id', $filters['chefia_imediata_id']))
            ->with(['chefiaImediata:id,nome_completo,matricula', 'user:id,name,email', 'orgUnit.parent', 'pessoa.contatos'])
            ->orderBy('nome_completo')
            ->paginate($perPage);
    }

    /**
     * @param array<string, mixed> $data
     */
    public function create(array $data): Servidor
    {
        $tenantId = (int) app(TenantContext::class)->id();

        // Normalização de CPF
        $cpf = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));
        // O CPF só existe na pessoa: um inválido não teria onde ficar (a pessoa nasceria pendente) e seria perdido.
        if (strlen($cpf) !== 11 || ServidorPessoaService::cpfValido($cpf) === null) {
            throw ValidationException::withMessages(['cpf' => 'O CPF informado é inválido.']);
        }

        $data['tenant_id'] = $tenantId;
        $data['situacao_funcional'] = $data['situacao_funcional'] ?? 'ativo';
        $civis = $this->extrairCivis($data);
        $contatos = $this->extrairContatos($data);

        return DB::transaction(function () use ($data, $civis, $contatos): Servidor {
            // A pessoa vem antes do servidor: `pessoa_id` é obrigatório e CPF, nome social e nascimento só existem nela.
            $pessoa = $this->pessoas->resolverParaNovo([...$civis, 'nome' => (string) ($data['nome_completo'] ?? '')]);
            $servidor = new Servidor($data);
            $servidor->forceFill(['pessoa_id' => $pessoa->id])->save();
            $this->pessoas->concluirCadastro($servidor, $pessoa, $contatos);

            return $servidor->load('pessoa.contatos');
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(Servidor $servidor, array $data): Servidor
    {
        $camposCivis = array_values(array_intersect(['nome_completo', 'nome_social', 'data_nascimento'], array_keys($data)));
        $civis = $this->extrairCivis($data);
        $contatos = $this->extrairContatos($data);
        if (trim((string) ($civis['cpf'] ?? '')) !== '' && ServidorPessoaService::cpfValido($civis['cpf']) === null) {
            throw ValidationException::withMessages(['cpf' => 'O CPF informado é inválido.']);
        }

        DB::transaction(function () use ($servidor, $data, $civis, $camposCivis, $contatos): void {
            $servidor->update($data);
            $this->pessoas->sincronizar($servidor, $civis, $camposCivis, $contatos);
        });

        return $servidor->fresh(['chefiaImediata', 'user']);
    }

    /**
     * Retira de `$data` o que vive só na pessoa (CPF, nome social, nascimento). Devolve só o que veio, para a edição
     * distinguir "não enviado" de "enviado vazio".
     *
     * @param array<string, mixed> $data
     * @return array{cpf?: string|null, nome_social?: string|null, data_nascimento?: string|null}
     */
    private function extrairCivis(array &$data): array
    {
        $civis = [];
        foreach (['cpf', 'nome_social', 'data_nascimento'] as $campo) {
            if (array_key_exists($campo, $data)) {
                $civis[$campo] = $data[$campo];
                unset($data[$campo]);
            }
        }

        return $civis;
    }

    /**
     * Retira de `$data` e-mail e telefone, que vivem como contatos da pessoa. Devolve só o que veio.
     *
     * @param array<string, mixed> $data
     * @return array{email?: string|null, telefone?: string|null}
     */
    private function extrairContatos(array &$data): array
    {
        $contatos = [];
        foreach (['email', 'telefone'] as $campo) {
            if (array_key_exists($campo, $data)) {
                $contatos[$campo] = $data[$campo];
                unset($data[$campo]);
            }
        }

        return $contatos;
    }

    /**
     * Processa importação em lote a partir de conteúdo CSV.
     *
     * @return array{total: int, inseridos: int, atualizados: int, erros: list<string>}
     */
    public function importFromCsv(string $csvContent): array
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $lines = preg_split('/\r\n|\r|\n/', trim($csvContent));
        if (empty($lines)) {
            return ['total' => 0, 'inseridos' => 0, 'atualizados' => 0, 'erros' => ['Arquivo CSV vazio.']];
        }

        // Delimitador (vírgula ou ponto e vírgula)
        $firstLine = $lines[0];
        $delimiter = str_contains($firstLine, ';') ? ';' : ',';
        $header = array_map('trim', str_getcsv(array_shift($lines), $delimiter));

        // Mapeamento de colunas flexível
        $colMap = [];
        foreach ($header as $idx => $col) {
            $normalized = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $col) ?: $col));
            $colMap[$normalized] = $idx;
        }

        $total = 0;
        $inseridos = 0;
        $atualizados = 0;
        $erros = [];

        foreach ($lines as $lineIndex => $line) {
            if (empty(trim($line))) continue;

            $row = str_getcsv($line, $delimiter);
            $total++;

            $matricula = trim($row[$colMap['matricula'] ?? -1] ?? '');
            $nome = trim($row[$colMap['nome'] ?? $colMap['nomecompleto'] ?? -1] ?? '');
            $cpfRaw = preg_replace('/\D/', '', trim($row[$colMap['cpf'] ?? -1] ?? ''));
            $cargo = trim($row[$colMap['cargo'] ?? $colMap['cargoefetivo'] ?? -1] ?? 'Servidor Municipal');
            $lotacao = trim($row[$colMap['lotacao'] ?? $colMap['orgaolotacao'] ?? $colMap['secretaria'] ?? -1] ?? 'Geral');

            if (empty($matricula) || empty($nome)) {
                $erros[] = "Linha " . ($lineIndex + 2) . ": Matrícula ou Nome ausentes.";
                continue;
            }

            // CPF ausente ou malformado não impede a linha: a pessoa nasce com documento pendente.
            $civis = ['cpf' => strlen($cpfRaw) === 11 ? $cpfRaw : null];

            $servidor = Servidor::where('tenant_id', $tenantId)->where('matricula', $matricula)->first();

            $payload = [
                'tenant_id' => $tenantId,
                'matricula' => $matricula,
                'nome_completo' => $nome,
                'cargo_efetivo' => $cargo,
                'orgao_lotacao' => $lotacao,
                'origem_sistema' => 'importacao_csv',
            ];

            try {
                // Sem pessoa não há servidor (`pessoa_id` é obrigatório): se o MDM recusar, só esta linha é desfeita.
                DB::transaction(function () use (&$servidor, $payload, $civis, &$inseridos, &$atualizados): void {
                    if ($servidor) {
                        $servidor->update($payload);
                        $this->pessoas->sincronizar($servidor, $civis);
                        $atualizados++;

                        return;
                    }

                    $pessoa = $this->pessoas->resolverParaNovo([...$civis, 'nome' => $payload['nome_completo']]);
                    $servidor = new Servidor($payload);
                    $servidor->forceFill(['pessoa_id' => $pessoa->id])->save();
                    $this->pessoas->concluirCadastro($servidor, $pessoa);
                    $inseridos++;
                });
            } catch (\Throwable $e) {
                $erros[] = 'Linha ' . ($lineIndex + 2) . ": servidor não gravado ({$e->getMessage()}).";
            }
        }

        return [
            'total' => $total,
            'inseridos' => $inseridos,
            'atualizados' => $atualizados,
            'erros' => $erros,
        ];
    }
}
