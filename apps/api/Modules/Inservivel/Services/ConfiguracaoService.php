<?php

declare(strict_types=1);

namespace Modules\Inservivel\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Inservivel\Models\Configuracao;
use Modules\Inservivel\Services\Concerns\RegistraMutacao;

/**
 * Configurações por prefeitura (D10): doador, legislação e documentos exigidos das entidades. Criada com os
 * padrões na primeira leitura; a chave de um documento exigido não muda depois de criada.
 */
final class ConfiguracaoService
{
    use RegistraMutacao;

    /** Documentos exigidos padrão (os 6 do PHP). */
    public const DOCUMENTOS_PADRAO = [
        ['chave' => 'estatuto_social', 'nome' => 'Estatuto social', 'obrigatorio' => true],
        ['chave' => 'ata_eleicao', 'nome' => 'Ata de eleição e posse da diretoria atual', 'obrigatorio' => true],
        ['chave' => 'cartao_cnpj', 'nome' => 'Cartão CNPJ', 'obrigatorio' => true],
        ['chave' => 'doc_identidade', 'nome' => 'Documento de identidade do representante legal', 'obrigatorio' => true],
        ['chave' => 'comprovante_endereco', 'nome' => 'Comprovante de endereço', 'obrigatorio' => true],
        ['chave' => 'certidoes_negativas', 'nome' => 'Certidões negativas', 'obrigatorio' => true],
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
    ) {}

    public function vigente(): Configuracao
    {
        return Configuracao::query()->firstOrCreate([], ['legislacao' => [], 'documentos_exigidos' => self::DOCUMENTOS_PADRAO]);
    }

    /** @return list<array{chave: string, nome: string, obrigatorio: bool}> */
    public function documentosExigidos(): array
    {
        return $this->vigente()->documentos_exigidos ?? [];
    }

    /** @return list<string> chaves dos documentos obrigatórios */
    public function chavesObrigatorias(): array
    {
        return array_values(array_map(fn (array $d): string => $d['chave'], array_filter($this->documentosExigidos(), fn (array $d): bool => $d['obrigatorio'])));
    }

    /** @param array<string, mixed> $dados */
    public function atualizar(array $dados): Configuracao
    {
        $config = $this->vigente();
        if (array_key_exists('documentos_exigidos', $dados)) {
            $dados['documentos_exigidos'] = $this->normalizarDocumentos($dados['documentos_exigidos'], $config->documentos_exigidos ?? []);
        }
        if (array_key_exists('legislacao', $dados)) {
            $dados['legislacao'] = array_values(array_filter(array_map(fn ($t): string => trim((string) $t), $dados['legislacao'] ?? []), fn (string $t): bool => $t !== ''));
        }
        if (isset($dados['doador_cnpj'])) {
            $dados['doador_cnpj'] = preg_replace('/\D/', '', (string) $dados['doador_cnpj']);
        }

        return DB::transaction(function () use ($config, $dados): Configuracao {
            $antes = $config->toArray();
            $config->fill($dados)->save();
            $this->auditar('configuracao', 'atualizada', (int) $config->id, $antes, $config->toArray());

            return $config;
        });
    }

    /**
     * Documento novo ganha chave derivada do nome; os existentes mantêm a chave (só nome e obrigatoriedade mudam).
     *
     * @param array<int, array<string, mixed>> $novos
     * @param array<int, array<string, mixed>> $atuais
     * @return list<array{chave: string, nome: string, obrigatorio: bool}>
     */
    private function normalizarDocumentos(array $novos, array $atuais): array
    {
        $chavesAtuais = array_column($atuais, 'chave');
        $resultado = [];
        foreach ($novos as $doc) {
            $nome = trim((string) ($doc['nome'] ?? ''));
            if ($nome === '') {
                throw new DomainException('Todo documento exigido precisa de um nome.');
            }
            $chave = (string) ($doc['chave'] ?? '');
            if ($chave !== '' && !in_array($chave, $chavesAtuais, true)) {
                throw new DomainException('A chave de um documento exigido não pode ser alterada.');
            }
            if ($chave === '') {
                $base = substr((string) preg_replace('/[^a-z0-9]+/', '_', LotacaoService::normalizar($nome)), 0, 40);
                $chave = trim($base, '_') ?: 'documento';
                $sufixo = 2;
                $usadas = [...$chavesAtuais, ...array_column($resultado, 'chave')];
                $candidata = $chave;
                while (in_array($candidata, $usadas, true)) {
                    $candidata = $chave . '_' . $sufixo++;
                }
                $chave = $candidata;
            }
            if (in_array($chave, array_column($resultado, 'chave'), true)) {
                throw new DomainException('Documento exigido repetido.');
            }
            $resultado[] = ['chave' => $chave, 'nome' => $nome, 'obrigatorio' => (bool) ($doc['obrigatorio'] ?? true)];
        }

        return $resultado;
    }
}
