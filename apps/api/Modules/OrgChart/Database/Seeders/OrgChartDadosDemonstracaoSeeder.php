<?php

declare(strict_types=1);

namespace Modules\OrgChart\Database\Seeders;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgTreeService;

/**
 * Organograma de demonstração do município: Gabinete do Prefeito como raiz, 9 secretarias
 * municipais, seus departamentos e, sob a Secretaria de Educação, as 6 unidades escolares que
 * o EscolaDadosDemonstracaoSeeder liga às escolas do Cadastro Escolar.
 *
 * Tudo pelo OrgTreeService (nível, caminho materializado, auditoria, outbox), com uma exceção
 * deliberada: se o tenant tiver uma unidade "solta" no topo — uma raiz sem Gabinete, como a que o
 * VistoriaDadosDemonstracaoSeeder criou antes de passar a usar o serviço —, o Gabinete é criado
 * direto no modelo e a unidade solta é pendurada abaixo dele. O serviço não permite fazer isso
 * (RN-ORG-002: a raiz não pode ser movida e só existe uma por tenant), então o reparo replica o
 * que moveUnit() faria, com o mesmo registro de auditoria, outbox e invalidação de cache.
 *
 * Idempotente: unidades já existentes (pelo código) não são recriadas.
 *
 * Uso: php artisan db:seed --force --class='Modules\OrgChart\Database\Seeders\OrgChartDadosDemonstracaoSeeder'
 */
final class OrgChartDadosDemonstracaoSeeder extends Seeder
{
    /** Código da unidade-raiz criada pelo seeder. */
    public const CODIGO_RAIZ = 'GAB';

    /** Código da Secretaria de Educação (pai das unidades escolares). */
    public const CODIGO_EDUCACAO = 'SME';

    /**
     * Unidades escolares: [código, nome, pai (código do departamento)].
     *
     * @var list<array{0: string, 1: string, 2: string}>
     */
    public const ESCOLAS = [
        ['ESC-01', 'Escola Municipal Santos Dumont', 'DEF'],
        ['ESC-02', 'Escola Municipal Tiradentes', 'DEF'],
        ['ESC-03', 'Escola Municipal Monteiro Lobato', 'DEF'],
        ['ESC-04', 'Escola Municipal Vila Nova', 'DEF'],
        ['ESC-05', 'CMEI Pequeno Príncipe', 'DEI'],
        ['ESC-06', 'Escola Rural Municipal do Passaúna', 'DEF'],
    ];

    private OrgTreeService $arvore;

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no organograma.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);
        $this->arvore = app(OrgTreeService::class);

        $criadas = 0;
        DB::transaction(function () use ($tenant, &$criadas): void {
            $raiz = $this->garantirRaiz($tenant);

            foreach ($this->estrutura() as [$codigo, $nome, $sigla, $gestor, $descricao, $filhas]) {
                $secretaria = $this->unidade($codigo, $nome, $sigla, 'secretaria', $raiz, ['gestor_name' => $gestor, 'description' => $descricao], $criadas);

                foreach ($filhas as [$codigoFilha, $nomeFilha, $siglaFilha]) {
                    $this->unidade($codigoFilha, $nomeFilha, $siglaFilha, 'departamento', $secretaria, [], $criadas);
                }
            }

            // Unidades escolares sob os departamentos de ensino da Secretaria de Educação.
            foreach (self::ESCOLAS as [$codigo, $nome, $codigoPai]) {
                $pai = OrgUnit::query()->where('code', $codigoPai)->first();
                if ($pai === null) {
                    $this->informar("Departamento {$codigoPai} não encontrado — escola {$codigo} não criada.", aviso: true);
                    continue;
                }
                $this->unidade($codigo, $nome, $codigo, 'divisao', $pai, ['description' => 'Unidade escolar da rede municipal.'], $criadas);
            }
        });

        $this->informar("Organograma de demonstração: {$criadas} unidades criadas no tenant [{$tenant->id}] {$tenant->name} (total: " . OrgUnit::query()->count() . ').');
    }

    // --------------------------------------------------------------- estrutura

    /**
     * @return list<array{0: string, 1: string, 2: string, 3: string, 4: string, 5: list<array{0: string, 1: string, 2: string}>}>
     */
    private function estrutura(): array
    {
        return [
            ['SMA', 'Secretaria Municipal de Administração', 'SMA', 'Marcos Aurélio Tavares', 'Gestão administrativa, patrimônio e compras públicas.', [
                ['DRH', 'Departamento de Recursos Humanos', 'DRH'], ['DCL', 'Departamento de Compras e Licitações', 'DCL'], ['DTI', 'Departamento de Tecnologia da Informação', 'DTI'],
            ]],
            ['SMF', 'Secretaria Municipal de Finanças & Planejamento', 'SMF', 'Helena Duarte Bastos', 'Execução orçamentária, contabilidade e arrecadação.', [
                ['DCO', 'Departamento de Contabilidade', 'DCO'], ['DTR', 'Departamento de Tributos', 'DTR'],
            ]],
            [self::CODIGO_EDUCACAO, 'Secretaria Municipal de Educação', 'SME', 'Rosana Pimentel Couto', 'Rede municipal de ensino, educação infantil e fundamental.', [
                ['DEF', 'Departamento de Ensino Fundamental', 'DEF'], ['DEI', 'Departamento de Educação Infantil', 'DEI'], ['DPE', 'Departamento Pedagógico', 'DPE'],
            ]],
            ['SMS', 'Secretaria Municipal de Saúde', 'SMS', 'Dr. Eduardo Vasconcelos Lima', 'Atenção básica, vigilância em saúde e assistência farmacêutica.', [
                ['DAB', 'Departamento de Atenção Básica', 'DAB'], ['DVS', 'Departamento de Vigilância em Saúde', 'DVS'], ['DAF', 'Departamento de Assistência Farmacêutica', 'DAF'],
            ]],
            ['SMO', 'Secretaria Municipal de Obras e Serviços Públicos', 'SMO', 'Eng. Ricardo Fontoura', 'Obras, pavimentação, iluminação pública e serviços urbanos.', [
                ['DOB', 'Departamento de Obras', 'DOB'], ['DSU', 'Departamento de Serviços Urbanos', 'DSU'],
            ]],
            ['SMAS', 'Secretaria Municipal de Assistência Social', 'SMAS', 'Cláudia Regina Matos', 'Proteção social básica e especial, CadÚnico e benefícios eventuais.', [
                ['CRAS', 'Centro de Referência de Assistência Social', 'CRAS'], ['CREAS', 'Centro de Referência Especializado de Assistência Social', 'CREAS'],
            ]],
            ['SMEL', 'Secretaria Municipal de Esportes e Lazer', 'SMEL', 'Alexandre Nogueira Prado', 'Esporte, lazer e equipamentos esportivos municipais.', []],
            ['SMMA', 'Secretaria Municipal de Meio Ambiente', 'SMMA', 'Bióloga Patrícia Moura Gentil', 'Licenciamento ambiental, fiscalização e áreas protegidas.', [
                ['DLA', 'Departamento de Licenciamento Ambiental', 'DLA'],
            ]],
        ];
    }

    // ---------------------------------------------------------------- criação

    /**
     * Cria a unidade se o código ainda não existir; devolve a existente ou a nova.
     *
     * @param array<string, mixed> $metadata
     */
    private function unidade(string $codigo, string $nome, string $sigla, string $tipo, OrgUnit $pai, array $metadata, int &$criadas): OrgUnit
    {
        $existente = OrgUnit::query()->where('code', $codigo)->first();
        if ($existente !== null) {
            return $existente;
        }

        $unidade = $this->arvore->createUnit([
            'name' => $nome,
            'code' => $codigo,
            'acronym' => $sigla,
            'type' => $tipo,
            'parent_id' => $pai->id,
            'metadata' => $metadata === [] ? null : $metadata,
        ]);
        $criadas++;

        return $unidade;
    }

    private function garantirRaiz(Tenant $tenant): OrgUnit
    {
        $raizes = OrgUnit::roots()->get();
        $nome = "Gabinete do Prefeito — {$tenant->name}";
        $metadata = ['description' => 'Órgão executivo superior da administração municipal.'];

        if ($raizes->isEmpty()) {
            return $this->arvore->createUnit(['name' => $nome, 'code' => self::CODIGO_RAIZ, 'acronym' => 'GAB', 'type' => 'raiz', 'metadata' => $metadata]);
        }

        $gabinete = $raizes->first(fn (OrgUnit $r): bool => $r->code === self::CODIGO_RAIZ);
        if ($gabinete !== null) {
            return $gabinete;
        }

        // Unidade(s) solta(s) no topo, sem Gabinete: cria o Gabinete direto no modelo (o serviço
        // recusa uma segunda raiz) e pendura as soltas abaixo dele.
        $gabinete = OrgUnit::create([
            'name' => $nome, 'code' => self::CODIGO_RAIZ, 'acronym' => 'GAB', 'type' => 'raiz',
            'parent_id' => null, 'level' => 1, 'path' => 'temp', 'order' => 1, 'is_active' => true, 'metadata' => $metadata,
        ]);
        $gabinete->updateQuietly(['path' => (string) $gabinete->id]);

        foreach ($raizes as $ordem => $solta) {
            $this->pendurar($solta, $gabinete, $ordem + 1);
        }

        return $gabinete->refresh();
    }

    /** Equivale ao moveUnit() para uma unidade que hoje é raiz: atualiza nível/caminho da unidade e dos descendentes. */
    private function pendurar(OrgUnit $unidade, OrgUnit $novoPai, int $ordem): void
    {
        $antes = $unidade->toArray();
        $caminhoAntigo = $unidade->path;
        $nivelAntigo = $unidade->level;
        $novoNivel = $novoPai->level + 1;
        $novoCaminho = "{$novoPai->path}.{$unidade->id}";

        $unidade->updateQuietly(['parent_id' => $novoPai->id, 'level' => $novoNivel, 'path' => $novoCaminho, 'order' => $ordem]);

        foreach (OrgUnit::query()->where('path', 'like', "{$caminhoAntigo}.%")->get() as $descendente) {
            $descendente->updateQuietly([
                'path' => $novoCaminho . substr($descendente->path, strlen($caminhoAntigo)),
                'level' => $descendente->level + ($novoNivel - $nivelAntigo),
            ]);
        }

        app(AuditLogger::class)->record('org', 'unit.moved', "OrgUnit #{$unidade->id} ({$unidade->name})", $antes, [
            'parent_id' => $novoPai->id, 'old_path' => $caminhoAntigo, 'new_path' => $novoCaminho, 'level' => $novoNivel,
        ]);
        app(OutboxPublisher::class)->publish('OrgUnitMoved', [
            'id' => $unidade->id, 'new_parent_id' => $novoPai->id, 'new_path' => $novoCaminho, 'new_level' => $novoNivel,
        ]);

        $tenantId = app(TenantContext::class)->id();
        Cache::forget("org:tree:{$tenantId}:0:1");
        Cache::forget("org:tree:{$tenantId}:0:0");
    }

    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
