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
                $q->where(function ($sub) use ($search): void {
                    $sub->where('nome_completo', 'like', $search)
                        ->orWhere('matricula', 'like', $search)
                        ->orWhere('cpf', 'like', $search)
                        ->orWhere('cargo_efetivo', 'like', $search)
                        ->orWhere('orgao_lotacao', 'like', $search);
                });
            })
            ->when(!empty($filters['situacao']), fn ($q) => $q->where('situacao_funcional', $filters['situacao']))
            ->when(isset($filters['estagio_probatorio']), fn ($q) => $q->where('estagio_probatorio', (bool) $filters['estagio_probatorio']))
            ->when(!empty($filters['orgao_lotacao']), fn ($q) => $q->where('orgao_lotacao', $filters['orgao_lotacao']))
            ->with(['chefiaImediata:id,nome_completo,matricula', 'user:id,name,email'])
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
        if (strlen($cpf) !== 11) {
            throw ValidationException::withMessages(['cpf' => 'O CPF informado é inválido.']);
        }
        $formattedCpf = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);

        $data['tenant_id'] = $tenantId;
        $data['cpf'] = $formattedCpf;
        $data['situacao_funcional'] = $data['situacao_funcional'] ?? 'ativo';

        return DB::transaction(fn () => Servidor::create($data));
    }

    /**
     * @param array<string, mixed> $data
     */
    public function update(Servidor $servidor, array $data): Servidor
    {
        if (!empty($data['cpf'])) {
            $cpf = preg_replace('/\D/', '', (string) $data['cpf']);
            if (strlen($cpf) === 11) {
                $data['cpf'] = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
            }
        }

        $servidor->update($data);

        return $servidor->fresh(['chefiaImediata', 'user']);
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

            $cpfFormatted = strlen($cpfRaw) === 11
                ? substr($cpfRaw, 0, 3) . '.' . substr($cpfRaw, 3, 3) . '.' . substr($cpfRaw, 6, 3) . '-' . substr($cpfRaw, 9, 2)
                : '000.000.000-00';

            $servidor = Servidor::where('tenant_id', $tenantId)->where('matricula', $matricula)->first();

            $payload = [
                'tenant_id' => $tenantId,
                'matricula' => $matricula,
                'nome_completo' => $nome,
                'cpf' => $cpfFormatted,
                'cargo_efetivo' => $cargo,
                'orgao_lotacao' => $lotacao,
                'origem_sistema' => 'importacao_csv',
            ];

            if ($servidor) {
                $servidor->update($payload);
                $atualizados++;
            } else {
                Servidor::create($payload);
                $inseridos++;
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
