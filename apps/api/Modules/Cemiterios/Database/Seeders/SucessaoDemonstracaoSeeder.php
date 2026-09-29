<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\SucessaoService;
use Modules\Cemiterios\Support\Documento;
use Modules\Cemiterios\Support\EstadoSucessao;
use Modules\Cemiterios\Support\Parentesco;
use Modules\Cemiterios\Support\TipoDocumentoSucessao;
use Modules\Cemiterios\Support\ViaSucessao;

/**
 * Seeder de dados de teste para Sucessão Hereditária (RF-SUCESSAO): 3 processos
 * por via (12 no total) cobrindo os estados-chave da máquina de estados
 * (solicitada, em_analise, validada→sucedida, indeferida, arquivada), com
 * herdeiros de parentescos variados, documentos e histórico de transições
 * reais (via SucessaoService, não registros "crus"). Usado para QA manual e
 * para popular o painel do web-client com cenários realistas.
 */
final class SucessaoDemonstracaoSeeder extends Seeder
{
    /** @var list<Parentesco> */
    private const PARENTESCOS_ROTATIVOS = [
        Parentesco::Companheiro,
        Parentesco::Filho,
        Parentesco::Pai,
        Parentesco::Irmao,
    ];

    public function run(?int $tenantId = null): void
    {
        $tenants = $tenantId !== null
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::where('slug', 'araucaria-pr')->orWhere('id', 2)->get();

        foreach ($tenants as $tenant) {
            $this->seedTenant((int) $tenant->id);
        }
    }

    public function seedTenant(int $tenantId): void
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return;
        }

        app(TenantContext::class)->set($tenant);
        echo "==> Semeando dados de teste de Sucessão Hereditária para o Tenant: [{$tenant->id}] {$tenant->name}\n";

        DB::transaction(function () use ($tenantId): void {
            $sucessaoService = app(SucessaoService::class);
            $parque = $this->criarParque($tenantId);

            foreach (ViaSucessao::cases() as $indiceVia => $via) {
                $this->criarSucessaoSolicitada($sucessaoService, $parque, $via, $indiceVia);
                $this->criarSucessaoEmAnaliseComHerdeiros($sucessaoService, $parque, $via, $indiceVia);
                $this->criarSucessaoEncerrada($sucessaoService, $parque, $via, $indiceVia);
            }
        });
    }

    private function criarParque(int $tenantId): Cemiterio
    {
        return Cemiterio::firstOrCreate(
            ['codigo' => 'DEMO-SUC'],
            ['nome' => 'Cemitério Demonstração — Sucessão Hereditária']
        );
    }

    private function novoJazigoComConcessao(Cemiterio $parque, string $sufixo): Concessao
    {
        $setor = $parque->setores()->firstOrCreate(
            ['codigo' => 'DEMO-SUC'],
            ['tipo_zona' => 'jazigos']
        );
        $jazigo = Jazigo::create([
            'park_id' => $parque->id,
            'sector_id' => $setor->id,
            'codigo' => "DEMO-SUC-{$sufixo}",
            'tipo' => 'jazigo',
            'capacidade' => 2,
        ]);

        $documento = $this->cpfDemonstracao($sufixo);
        $titular = Concessionario::create([
            'nome' => "Titular Falecido {$sufixo}",
            'tipo_doc' => 'cpf',
            'documento' => $documento,
            'documento_hash' => Documento::hash($documento),
            'titular_falecido' => true,
        ]);

        return Concessao::create([
            'numero' => "DEMO-SUC-{$sufixo}",
            'plot_id' => $jazigo->id,
            'holder_id' => $titular->id,
            'tipo' => 'perpetua',
            'data_inicio' => '2000-01-01',
            'estado' => 'Ativa',
            'pendencia_regularizacao' => true,
            'motivo_pendencia' => 'sucessao_hereditaria',
        ]);
    }

    private function cpfDemonstracao(string $sufixo): string
    {
        return str_pad((string) crc32($sufixo), 11, '0', STR_PAD_LEFT);
    }

    private function criarSucessaoSolicitada(SucessaoService $service, Cemiterio $parque, ViaSucessao $via, int $indiceVia): void
    {
        $concessao = $this->novoJazigoComConcessao($parque, "{$via->value}-1");

        $service->abrirProcesso([
            'concession_id' => $concessao->id,
            'via' => $via,
            'processo_referencia' => 'DEMO-' . Str::upper($via->value) . '-01',
            'data_falecimento' => now()->subDays(10)->toDateString(),
        ]);
    }

    private function criarSucessaoEmAnaliseComHerdeiros(SucessaoService $service, Cemiterio $parque, ViaSucessao $via, int $indiceVia): void
    {
        $concessao = $this->novoJazigoComConcessao($parque, "{$via->value}-2");

        $sucessao = $service->abrirProcesso([
            'concession_id' => $concessao->id,
            'via' => $via,
            'processo_referencia' => 'DEMO-' . Str::upper($via->value) . '-02',
            'data_falecimento' => now()->subDays(40)->toDateString(),
        ]);

        $sucessao = $service->transicionar($sucessao, EstadoSucessao::EmAnalise, 'Documentação inicial conferida (dados de demonstração).');

        $parentescoA = self::PARENTESCOS_ROTATIVOS[$indiceVia % count(self::PARENTESCOS_ROTATIVOS)];
        $parentescoB = self::PARENTESCOS_ROTATIVOS[($indiceVia + 1) % count(self::PARENTESCOS_ROTATIVOS)];

        $service->adicionarHerdeiro($sucessao, [
            'nome' => 'Herdeiro Demonstração A',
            'parentesco' => $parentescoA,
            'documento' => $this->cpfDemonstracao("{$via->value}-herdeiro-a"),
            'ordem' => 1,
            'titular_indicado' => true,
        ]);
        $service->adicionarHerdeiro($sucessao, [
            'nome' => 'Herdeiro Demonstração B',
            'parentesco' => $parentescoB,
            'documento' => $this->cpfDemonstracao("{$via->value}-herdeiro-b"),
            'ordem' => 1,
        ]);

        $sucessao->documentos()->create([
            'tipo' => TipoDocumentoSucessao::CertidaoObito,
            'arquivo' => "tenant-demo/sucessao/{$sucessao->id}/certidao_obito.pdf",
            'hash' => hash('sha256', "demo-certidao-{$sucessao->id}"),
        ]);
    }

    private function criarSucessaoEncerrada(SucessaoService $service, Cemiterio $parque, ViaSucessao $via, int $indiceVia): void
    {
        $concessao = $this->novoJazigoComConcessao($parque, "{$via->value}-3");

        $sucessao = $service->abrirProcesso([
            'concession_id' => $concessao->id,
            'via' => $via,
            'processo_referencia' => 'DEMO-' . Str::upper($via->value) . '-03',
            'data_falecimento' => now()->subDays(150)->toDateString(),
        ]);
        $sucessao = $service->transicionar($sucessao, EstadoSucessao::EmAnalise, 'Documentação conferida (dados de demonstração).');

        // Alterna o desfecho por via para cobrir sucedida, indeferida e arquivada.
        $desfecho = $indiceVia % 3;

        if ($desfecho === 0) {
            $sucessao = $service->transicionar($sucessao, EstadoSucessao::Validada, 'Cadeia sucessória validada (dados de demonstração).');
            $service->adicionarHerdeiro($sucessao, [
                'nome' => 'Herdeiro Sucessor Demonstração',
                'parentesco' => Parentesco::Filho,
                'documento' => $this->cpfDemonstracao("{$via->value}-sucessor"),
                'ordem' => 1,
                'titular_indicado' => true,
            ]);
            $service->concluir($sucessao->fresh());

            return;
        }

        if ($desfecho === 1) {
            $service->indeferir($sucessao, 'Documentação insuficiente para comprovar a cadeia sucessória (dados de demonstração).');

            return;
        }

        $sucessao = $service->indeferir($sucessao, 'Prazo de regularização vencido sem manifestação (dados de demonstração).');
        $service->arquivar($sucessao->fresh());
    }
}
