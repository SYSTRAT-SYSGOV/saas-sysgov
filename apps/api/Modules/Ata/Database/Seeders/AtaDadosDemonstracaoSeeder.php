<?php

declare(strict_types=1);

namespace Modules\Ata\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Modules\Ata\Models\Ata;
use Modules\Ata\Services\AssinaturaService;
use Modules\Ata\Services\AtaPdfService;
use Modules\Ata\Services\AtaService;

/**
 * Massa de dados de demonstração do módulo Atas: 16 atas das secretarias do organograma, de todos os
 * tipos, em todas as fases do fluxo: em redação, rascunho travado (sem assinaturas e com assinaturas
 * parciais) e finalizadas, com o PDF gerado, o código de validação e todas as assinaturas. Parte delas é
 * sigilosa.
 *
 * Tudo passa pelos Services do módulo (numeração por secretaria e ano, texto sanitizado, trava do
 * rascunho, assinaturas, PDF e auditoria). As assinaturas são rubricas desenhadas na hora, só para a
 * demonstração; nomes e cargos dos participantes são fictícios.
 *
 * Uso: php artisan db:seed --force --class='Modules\Ata\Database\Seeders\AtaDadosDemonstracaoSeeder'
 * Depende do organograma (OrgChartDadosDemonstracaoSeeder). Não roda se o tenant já tiver mais de uma ata.
 */
final class AtaDadosDemonstracaoSeeder extends Seeder
{
    /** @var list<array{string, string}> nome, cargo */
    private const PARTICIPANTES = [
        ['Helena Duarte Albuquerque', 'Secretária Municipal'],
        ['Rafael Nogueira Prado', 'Diretor de Departamento'],
        ['Sandra Vieira Machado', 'Chefe de Divisão'],
        ['Carlos Menezes Tavares', 'Assessor Técnico'],
        ['Fernanda Rocha Lacerda', 'Procuradora'],
        ['João Lima Fontana', 'Controlador Interno'],
        ['Luciana Prado Bastos', 'Analista Administrativa'],
        ['Marcos Antunes Ribeiro', 'Representante da Comunidade'],
    ];

    /** @var list<array{string, string}> título, assunto */
    private const PAUTAS = [
        ['Reunião de planejamento do exercício', 'do planejamento das ações e da distribuição das metas do exercício'],
        ['Reunião de alinhamento com os departamentos', 'do alinhamento das entregas dos departamentos e dos prazos do trimestre'],
        ['Audiência pública sobre o plano de ação', 'das propostas da comunidade para o plano de ação da secretaria'],
        ['Reunião da comissão de acompanhamento', 'do andamento dos contratos vigentes e das pendências de fiscalização'],
        ['Reunião extraordinária sobre o orçamento', 'do remanejamento de dotações e da revisão do cronograma de desembolso'],
        ['Reunião do conselho', 'dos pareceres pendentes e das deliberações do período'],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear em Atas.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('atas')->where('tenant_id', $tenant->id)->count() > 1) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem atas — nada a fazer.");
            return;
        }

        $secretarias = DB::table('org_units')->where('tenant_id', $tenant->id)->where('type', 'secretaria')->where('is_active', true)->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $tipos = DB::table('ata_tipos')->where('tenant_id', $tenant->id)->where('ativo', true)->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
        if ($secretarias === [] || $tipos === []) {
            $this->informar('Faltam secretarias no organograma ou tipos de ata — execute antes o OrgChartDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $total = ['atas' => 0, 'finalizadas' => 0];

        DB::transaction(function () use ($secretarias, $tipos, $usuario, &$total): void {
            $hoje = CarbonImmutable::today();
            // Fase de cada ata: er = em redação, ra = rascunho, as = rascunho com assinaturas parciais, fi = finalizada.
            $fases = ['fi', 'fi', 'fi', 'fi', 'fi', 'fi', 'as', 'as', 'ra', 'ra', 'ra', 'er', 'er', 'er', 'fi', 'ra'];
            foreach ($fases as $i => $fase) {
                $this->criarAta($i, $fase, $secretarias, $tipos, $hoje, $usuario);
                $total['atas']++;
                $total['finalizadas'] += $fase === 'fi' ? 1 : 0;
            }
        });

        $this->informar("Atas de demonstração criadas no tenant [{$tenant->id}] {$tenant->name}: {$total['atas']} atas, {$total['finalizadas']} finalizadas com PDF.");
    }

    /**
     * @param list<int> $secretarias
     * @param list<int> $tipos
     */
    private function criarAta(int $i, string $fase, array $secretarias, array $tipos, CarbonImmutable $hoje, User $usuario): void
    {
        $atas = app(AtaService::class);
        [$titulo, $assunto] = self::PAUTAS[$i % count(self::PAUTAS)];
        $data = $hoje->subDays(5 + $i * 9)->setTime(9 + $i % 6, 0);
        $participantes = array_map(
            fn (array $p): array => ['nome' => $p[0], 'cargo' => $p[1]],
            array_slice(self::PARTICIPANTES, $i % 3, 4 + $i % 3),
        );

        $ata = $atas->criar([
            'org_unit_id' => $secretarias[$i % count($secretarias)],
            'tipo_id' => $tipos[$i % count($tipos)],
            'titulo' => $titulo,
            'data_reuniao' => $data->format('Y-m-d H:i:s'),
            'local' => 'Sala de reuniões da secretaria',
            'cidade' => 'Araucária',
            'redator' => $participantes[1]['nome'] ?? $participantes[0]['nome'],
            'sigilosa' => $i % 7 === 6,
            'conteudo_html' => $fase === 'er' ? '<p>Pauta: discussão ' . $assunto . '.</p>' : $this->texto($titulo, $assunto, $data, $participantes),
            'participantes' => $participantes,
        ], $usuario);

        if ($fase === 'er') {
            return;
        }
        $ata = $atas->salvarRascunho($ata, null);
        if ($fase === 'ra') {
            return;
        }

        $assinatura = app(AssinaturaService::class);
        $pendentes = $assinatura->pendentes($ata);
        $assinam = $fase === 'fi' ? $pendentes->count() : max(1, intdiv($pendentes->count(), 2));
        foreach ($pendentes->take($assinam) as $participante) {
            $assinatura->assinar($ata, (int) $participante->id, $this->rubrica($i + (int) $participante->id), $usuario);
        }

        if ($fase === 'fi') {
            app(AtaPdfService::class)->finalizar($ata->refresh(), $usuario);
        }
    }

    /** @param list<array{nome: string, cargo: string}> $participantes */
    private function texto(string $titulo, string $assunto, CarbonImmutable $data, array $participantes): string
    {
        $lista = implode('', array_map(fn (array $p): string => "<li>{$p['nome']} — {$p['cargo']}</li>", $participantes));

        return '<h2>' . $titulo . '</h2>'
            . '<p>Aos ' . $data->format('d/m/Y') . ', às ' . $data->format('H:i') . ', reuniram-se os abaixo relacionados para tratar ' . $assunto . '.</p>'
            . '<p><strong>Presentes:</strong></p><ul>' . $lista . '</ul>'
            . '<p><strong>Deliberações:</strong></p><ol>'
            . '<li>Aprovada, por unanimidade, a pauta apresentada.</li>'
            . '<li>Definido o prazo de quinze dias para a entrega dos relatórios pendentes.</li>'
            . '<li>Encaminhadas à Procuradoria as dúvidas sobre os processos em andamento.</li>'
            . '</ol>'
            . '<p>Nada mais havendo a tratar, lavrou-se a presente ata, que segue assinada pelos participantes.</p>';
    }

    /** Rubrica desenhada com GD (traço sinuoso) devolvida como data URI PNG. */
    private function rubrica(int $semente): string
    {
        $img = imagecreatetruecolor(300, 100);
        imagesavealpha($img, true);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 255, 255, 255, 127));
        imagesetthickness($img, 3);
        $tinta = imagecolorallocate($img, 20, 40, 120);
        $x = 15;
        $y = 55;
        for ($k = 0; $k < 14; $k++) {
            $nx = $x + 16 + (($semente * 7 + $k * 5) % 9);
            $ny = 20 + (($semente * 13 + $k * 29) % 60);
            imageline($img, $x, $y, $nx, $ny, $tinta);
            [$x, $y] = [$nx, $ny];
        }
        ob_start();
        imagepng($img);
        $png = (string) ob_get_clean();

        return 'data:image/png;base64,' . base64_encode($png);
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
