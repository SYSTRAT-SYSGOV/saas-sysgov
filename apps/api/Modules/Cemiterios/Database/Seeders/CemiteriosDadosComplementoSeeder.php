<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\ExcecaoJudicial;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cemiterios\Services\EmpreiteiroService;

/**
 * Complemento do CemiteriosDadosVolumeSeeder. O gerador de grade do GIS descarta as células que
 * não cabem no polígono (ou ficam perto demais das vizinhas), então o cemitério CSJ ficou com
 * menos jazigos que o previsto e os últimos cenários da lista não foram criados. Este seeder
 * cobre o que faltou usando as gavetas livres da quadra C: exumações (concluídas, pendente e
 * suspensa), exumação judicial, trasladações (interna e externa) e processos de abandono
 * (instaurado, em edital, decidido) — e acrescenta obras históricas dos empreiteiros aptos
 * (concluídas e atrasadas), que o limite de obras simultâneas impediu de criar pelo Service.
 *
 * Uso: php artisan db:seed --force --class='Modules\Cemiterios\Database\Seeders\CemiteriosDadosComplementoSeeder'
 * Pré-requisito: CemiteriosDadosVolumeSeeder já executado. Não roda se já existir exceção
 * judicial (marcador de que o complemento já foi aplicado).
 */
final class CemiteriosDadosComplementoSeeder extends CemiteriosDadosVolumeSeeder
{
    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a complementar em Cemitérios.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);
        $this->tenantId = (int) $tenant->id;

        $parque = Cemiterio::query()->where('codigo', 'CSJ')->first();
        if ($parque === null) {
            $this->informar('Cemitério CSJ não encontrado — execute antes o CemiteriosDadosVolumeSeeder.', aviso: true);
            return;
        }

        if (ExcecaoJudicial::query()->exists()) {
            $this->informar('O complemento de Cemitérios já foi aplicado — nada a fazer.');
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        $this->usuario = $usuario;
        auth()->setUser($usuario);

        // Reconstitui o estado que o seeder anterior mantinha em memória.
        $this->concessionarios = Concessionario::query()->where('cidade', 'Araucária')->where('uf', 'PR')->orderBy('id')->get()->all();
        $this->coveiros = OperadorCemiterio::query()->where('tipo', 'coveiro')->orderBy('id')->get()->all();
        $this->pedreiros = OperadorCemiterio::query()->where('tipo', 'pedreiro')->orderBy('id')->get()->all();
        $this->contador = (int) Falecido::query()->count() + 200;   // evita colisão de certidão/nome com os já criados

        if (count($this->concessionarios) < 30 || count($this->coveiros) < 3 || count($this->pedreiros) < 2) {
            $this->informar('Pré-requisitos do seeder anterior não encontrados (concessionários/operadores).', aviso: true);
            return;
        }

        DB::transaction(function () use ($parque): void {
            $this->complementarGavetas($parque);
            $this->tentar('obras históricas', fn () => $this->obrasHistoricas($parque));
        });

        $this->informar('Complemento de Cemitérios aplicado no tenant [' . $tenant->id . '] ' . $tenant->name . '.');
        foreach ($this->avisos as $aviso) {
            $this->informar("  aviso: {$aviso}", aviso: true);
        }
    }

    private function complementarGavetas(Cemiterio $parque): void
    {
        $livres = Jazigo::query()->where('park_id', $parque->id)->where('tipo', 'gaveta')->orderBy('id')->get()
            ->filter(fn (Jazigo $g): bool => $g->ocupacao === 0 && !Concessao::query()->where('plot_id', $g->id)->exists())
            ->values();

        $cenarios = [
            'exumacao_concluida', 'exumacao_concluida', 'exumacao_pendente', 'exumacao_suspensa',
            'trasladacao_interna', 'trasladacao_externa', 'judicial',
            'abandono_instaurado', 'abandono_edital', 'abandono_decidido',
        ];

        // As duas últimas gavetas livres ficam como destino das trasladações internas.
        $destinos = $livres->slice(max($livres->count() - 2, 0))->values();
        $usaveis = $livres->slice(0, max($livres->count() - 2, 0))->values();

        foreach ($cenarios as $i => $cenario) {
            $gaveta = $usaveis->get($i);
            if ($gaveta === null) {
                $this->avisos[] = "sem gaveta livre para o cenário {$cenario}";
                continue;
            }

            $this->tentar("gaveta {$gaveta->codigo} ({$cenario})", fn () => $this->cenarioJazigo($gaveta->refresh(), $cenario, 50 + $i, $destinos));
        }
    }

    /**
     * Obras que o limite de obras simultâneas (2 por empreiteiro, contando as com prazo futuro) não deixou criar
     * pelo Service: histórico de obras concluídas e uma atrasada por empreiteiro apto. Gravadas direto no modelo.
     */
    private function obrasHistoricas(Cemiterio $parque): void
    {
        $jazigos = Jazigo::query()->where('park_id', $parque->id)->where('tipo', 'jazigo')->orderBy('id')->get()
            ->filter(fn (Jazigo $j): bool => $j->concessaoVigente() !== null)
            ->values();
        if ($jazigos->isEmpty()) {
            return;
        }

        $descricoes = ['Reforma e troca de tampa', 'Pintura e gravação de lápide', 'Revestimento em mármore', 'Reparo de trincas na laje'];
        $k = 0;
        foreach (Empreiteiro::query()->where('situacao', 'apto')->orderBy('id')->limit(2)->get() as $empreiteiro) {
            foreach ([['concluida', -150], ['concluida', -75], ['pendente', -12]] as [$situacao, $dias]) {
                $empreiteiro->obras()->create([
                    'plot_id' => $jazigos->get($k % $jazigos->count())->id,
                    'descricao' => $descricoes[$k % count($descricoes)] . ' (dados de demonstração)',
                    'comprimento_m' => 2.2,
                    'largura_m' => 1.0,
                    'prazo_fim' => CarbonImmutable::today()->addDays($dias)->toDateString(),
                    'situacao' => $situacao,
                ]);
                $k++;
            }
        }

        // Sinaliza as pendentes com prazo vencido e reavalia a aptidão.
        app(EmpreiteiroService::class)->rotinaDiaria();
    }
}
