<?php

declare(strict_types=1);

namespace Modules\Inservivel\Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Modules\Inservivel\Enums\StatusEntidade;
use Modules\Inservivel\Enums\StatusLote;
use Modules\Inservivel\Enums\StatusTransferencia;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Services\BemService;
use Modules\Inservivel\Services\CadastroEntidadeService;
use Modules\Inservivel\Services\EntidadeService;
use Modules\Inservivel\Services\InscricaoService;
use Modules\Inservivel\Services\LoteService;
use Modules\Inservivel\Services\SorteioService;
use Modules\Inservivel\Services\TransferenciaService;

/**
 * Massa de dados de demonstração do Patrimônio Inservível:
 *
 *  - 60 bens de todas as categorias e estados de conservação, distribuídos pelas secretarias do
 *    organograma, em avaliação ou já declarados inservíveis;
 *  - 8 entidades donatárias (habilitadas, em análise, pendente, reprovada e desabilitada);
 *  - 6 lotes em todas as fases: aberto, publicado com inscritas, sorteado, entregue e baixado;
 *  - sorteios feitos pelo SorteioService (regra, semente e hash de auditoria);
 *  - bens anunciados para transferência entre secretarias, com solicitação, aprovação e recusa.
 *
 * Tudo passa pelos Services do módulo. As entidades são fictícias, com CNPJ e CPF de dígitos
 * verificadores válidos gerados de uma base fixa e e-mails em domínio de exemplo. Cada entidade recebe
 * uma senha aleatória que não é guardada em lugar nenhum: o acesso ao portal delas não faz parte da
 * demonstração, e quem precisar entrar como entidade cria o acesso pelo cadastro normal.
 *
 * Uso: php artisan db:seed --force --class='Modules\Inservivel\Database\Seeders\InservivelDadosDemonstracaoSeeder'
 * Depende do organograma (OrgChartDadosDemonstracaoSeeder). Não roda se o tenant já tiver bens.
 */
final class InservivelDadosDemonstracaoSeeder extends Seeder
{
    /** @var list<array{int, string, string, string}> categoria, descrição, marca, modelo */
    private const ITENS = [
        [1, 'Cadeira giratória com braço', 'Flexform', 'Executiva'],
        [1, 'Armário de aço com duas portas', 'Pandin', 'AA-02'],
        [1, 'Mesa de escritório em L', 'Marelli', 'ML-150'],
        [1, 'Arquivo de aço com quatro gavetas', 'Pandin', 'AQ-4'],
        [2, 'Computador desktop', 'Dell', 'OptiPlex 3040'],
        [2, 'Monitor LCD 19 polegadas', 'LG', 'E1942'],
        [2, 'Impressora a laser', 'HP', 'LaserJet P2055'],
        [2, 'Nobreak 1200 VA', 'SMS', 'Station II'],
        [3, 'Camionete cabine simples', 'Fiat', 'Strada'],
        [3, 'Motocicleta 125 cc', 'Honda', 'CG 125'],
        [4, 'Refrigerador duplex', 'Consul', 'CRD36'],
        [4, 'Ar-condicionado split 12000 BTU', 'Springer', 'Midea'],
        [4, 'Ventilador de coluna', 'Mallory', 'Turbo 60'],
        [5, 'Bebedouro industrial', 'Karina', 'BI-50'],
        [5, 'Quadro branco magnético', 'Souza', 'QB-120'],
    ];

    /** @var list<array{string, string, string, string, string}> razão social, fantasia, área, cidade, finalidade */
    private const ENTIDADES = [
        ['Associação Amigos da Escola Rural', 'Amigos da Escola Rural', 'Educação', 'Araucária', 'Equipar a biblioteca e a sala de informática da escola comunitária.'],
        ['Lar dos Idosos Santa Rita', 'Lar Santa Rita', 'Assistência social', 'Curitiba', 'Mobiliar os quartos e a cozinha do abrigo para idosos.'],
        ['Instituto Esperança Viva', 'Esperança Viva', 'Assistência social', 'Contenda', 'Montar oficinas de capacitação profissional para jovens.'],
        ['Cooperativa de Catadores Novo Horizonte', 'Novo Horizonte', 'Meio ambiente', 'Araucária', 'Reaproveitar equipamentos no galpão de triagem de recicláveis.'],
        ['Associação de Moradores do Jardim das Flores', 'Moradores Jardim das Flores', 'Comunidade', 'Araucária', 'Equipar o salão comunitário.'],
        ['Centro de Apoio à Criança Semente', 'Centro Semente', 'Infância', 'Curitiba', 'Equipar o espaço de contraturno para crianças.'],
        ['Associação Pró-Saúde Mãos Amigas', 'Mãos Amigas', 'Saúde', 'Fazenda Rio Grande', 'Atender famílias em tratamento com doação de móveis e eletrodomésticos.'],
        ['Clube de Mães Maria de Nazaré', 'Clube de Mães', 'Comunidade', 'Araucária', 'Oficinas de artesanato e geração de renda.'],
    ];

    public function run(?int $tenantId = null): void
    {
        $tenant = $tenantId !== null
            ? Tenant::find($tenantId)
            : Tenant::where('slug', 'systrat')->first();

        if (!$tenant) {
            $this->informar('Tenant não encontrado — nada a semear no Patrimônio Inservível.', aviso: true);
            return;
        }

        app(TenantContext::class)->set($tenant);

        if (DB::table('inservivel_bens')->where('tenant_id', $tenant->id)->exists()) {
            $this->informar("Tenant [{$tenant->id}] {$tenant->name} já tem bens no Patrimônio Inservível — nada a fazer.");
            return;
        }

        $secretarias = DB::table('org_units')->where('tenant_id', $tenant->id)->where('type', 'secretaria')->where('is_active', true)->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
        if ($secretarias === []) {
            $this->informar('Não há secretarias no organograma — execute antes o OrgChartDadosDemonstracaoSeeder.', aviso: true);
            return;
        }

        $usuario = $tenant->users()->orderBy('users.id')->limit(1)->get()->get(0);
        if (!$usuario instanceof User) {
            $this->informar('O tenant não tem usuários.', aviso: true);
            return;
        }
        auth()->setUser($usuario);

        $totais = ['bens' => 0, 'entidades' => 0, 'lotes' => 0, 'sorteios' => 0, 'transferencias' => 0];

        DB::transaction(function () use ($secretarias, $usuario, &$totais): void {
            $bens = $this->criarBens($secretarias, $usuario, $totais);
            $entidades = $this->criarEntidades($totais);
            // Só bens "Inservível" entram em lote ou são anunciados; os "Em Avaliação" ficam parados para mostrar a fila.
            $inservis = array_values(array_filter($bens, fn (Bem $b): bool => $b->situacao_id === $this->idSituacao('Inservível')));
            $this->criarLotes(array_slice($inservis, 0, 36), $entidades, $usuario, $totais);
            $this->criarTransferencias(array_slice($inservis, 36, 6), $secretarias, $usuario, $totais);
        });

        $this->informar(sprintf(
            'Patrimônio Inservível de demonstração criado no tenant [%d] %s: %d bens, %d entidades, %d lotes, %d sorteios e %d transferências.',
            $tenant->id, $tenant->name, $totais['bens'], $totais['entidades'], $totais['lotes'], $totais['sorteios'], $totais['transferencias'],
        ));
    }

    /**
     * @param list<int> $secretarias
     * @param array<string, int> $totais
     * @return list<Bem>
     */
    private function criarBens(array $secretarias, User $usuario, array &$totais): array
    {
        $estados = DB::table('inservivel_estados_conservacao')->orderBy('id')->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $hoje = CarbonImmutable::today();
        $bens = [];

        for ($i = 0; $i < 60; $i++) {
            [$categoria, $descricao, $marca, $modelo] = self::ITENS[$i % count(self::ITENS)];
            $aquisicao = $hoje->subYears(4 + $i % 12)->subDays($i * 11);
            $valor = (30000 + (($i * 7919) % 90) * 5000);
            $bens[] = app(BemService::class)->salvar(null, [
                'numero_patrimonial' => sprintf('PAT-%06d', 410000 + $i * 17),
                'descricao' => $descricao,
                'categoria_id' => $categoria,
                'marca' => $marca,
                'modelo' => $modelo,
                'numero_serie' => $categoria === 5 ? null : sprintf('SN%08d', 5200000 + $i * 131),
                'situacao_id' => $this->idSituacao($i % 5 === 0 ? 'Em Avaliação' : 'Inservível'),
                'estado_conservacao_id' => $estados[$i % count($estados)],
                'valor_contabil_cents' => $valor,
                'valor_avaliado_cents' => intdiv($valor, 4 + $i % 4),
                'data_aquisicao' => $aquisicao->toDateString(),
                'data_incorporacao' => $aquisicao->addDays(20)->toDateString(),
                'secretaria_unit_id' => $secretarias[$i % count($secretarias)],
                'observacoes' => $i % 4 === 0 ? 'Recolhido do almoxarifado após a troca do mobiliário do setor.' : null,
            ], $usuario);
            $totais['bens']++;
        }

        return $bens;
    }

    /**
     * @param array<string, int> $totais
     * @return list<Entidade>
     */
    private function criarEntidades(array &$totais): array
    {
        $entidades = [];
        // Situação final de cada entidade, na mesma ordem de ENTIDADES.
        $situacoes = ['habilitada', 'habilitada', 'habilitada', 'habilitada', 'habilitada', 'em_analise', 'pendente', 'reprovada'];

        foreach (self::ENTIDADES as $i => [$razao, $fantasia, $area, $cidade, $finalidade]) {
            $entidade = app(CadastroEntidadeService::class)->cadastrar([
                'razao_social' => $razao,
                'nome_fantasia' => $fantasia,
                'cnpj' => $this->gerarCnpj(33810000 + $i * 70421),
                'endereco' => 'Rua das Acácias, ' . (100 + $i * 37),
                'cep' => '83702' . sprintf('%03d', 100 + $i),
                'cidade' => $cidade,
                'uf' => 'PR',
                'telefone' => sprintf('(41) 3333-%04d', 4100 + $i),
                'celular' => sprintf('(41) 99920-%04d', 3100 + $i),
                'email' => Str::slug($fantasia) . '@entidade.exemplo.org',
                'representante_legal' => ['Joana Aparecida Pires', 'Silvio Roberto Matos', 'Marlene Costa Reis', 'Edgar Luiz Fontana', 'Terezinha Gomes Vidal', 'Antônio Carlos Bueno', 'Rosângela Dias Prado', 'Lúcia Helena Barros'][$i],
                'cpf_representante' => $this->gerarCpf(723100000 + $i * 6113791),
                'cargo_representante' => 'Presidente',
                'tempo_funcionamento_anos' => 3 + $i * 2,
                'area_atuacao' => $area,
                'finalidade' => $finalidade,
                'numero_beneficiarios' => 40 + $i * 35,
            ], Str::random(24), [], [], 'seeder', false);
            $totais['entidades']++;

            $situacao = $situacoes[$i];
            if ($situacao !== 'pendente') {
                $status = StatusEntidade::from($situacao);
                $faltantes = $status === StatusEntidade::Reprovada ? ['Certidão negativa de débitos municipais'] : [];
                app(EntidadeService::class)->alterarStatus($entidade, $status, $faltantes, null);
            }
            $entidades[] = $entidade->refresh();
        }

        return $entidades;
    }

    /**
     * @param list<Bem> $bens
     * @param list<Entidade> $entidades
     * @param array<string, int> $totais
     */
    private function criarLotes(array $bens, array $entidades, User $usuario, array &$totais): void
    {
        $lotes = app(LoteService::class);
        $inscricoes = app(InscricaoService::class);
        $habilitadas = array_values(array_filter($entidades, fn (Entidade $e): bool => $e->status === StatusEntidade::Habilitada));
        $hoje = CarbonImmutable::today();

        // [número, descrição, fase final, quantas entidades se inscrevem]
        $cenarios = [
            ['001', 'Mobiliário de escritório — Secretaria de Administração', 'entregue', 3],
            ['002', 'Equipamentos de informática sem uso', 'sorteado', 4],
            ['003', 'Eletrodomésticos e bebedouros', 'publicado', 3],
            ['004', 'Cadeiras e mesas escolares remanejadas', 'publicado', 0],
            ['005', 'Ar-condicionados e ventiladores', 'aberto', 0],
            ['006', 'Lote antigo de móveis (encerrado)', 'baixado', 2],
        ];

        foreach ($cenarios as $k => [$numero, $descricao, $fase, $inscritas]) {
            $doLote = array_slice($bens, 6 * $k, 6);
            $lote = $lotes->criar([
                'numero' => $numero,
                'descricao' => $descricao,
                'data_criacao' => $hoje->subDays(60 - $k * 8)->toDateString(),
                'responsavel' => 'Divisão de Patrimônio',
                'data_sorteio_prevista' => $hoje->subDays(40 - $k * 8)->toDateString(),
                'observacoes' => null,
            ], array_map(fn (Bem $b): int => $b->id, $doLote), $usuario);
            $totais['lotes']++;

            if ($fase === 'aberto') {
                continue;
            }
            $lotes->alterarStatus($lote, StatusLote::Publicado);
            foreach (array_slice($habilitadas, 0, $inscritas) as $entidade) {
                $inscricoes->participar($entidade, $lote, '203.0.113.' . (10 + $k));
            }
            if (in_array($fase, ['sorteado', 'entregue', 'baixado'], true)) {
                app(SorteioService::class)->sortear($lote->refresh(), $usuario);
                $totais['sorteios']++;
            }
            if (in_array($fase, ['entregue', 'baixado'], true)) {
                $lotes->alterarStatus($lote->refresh(), StatusLote::Entregue);
            }
            if ($fase === 'baixado') {
                $lotes->alterarStatus($lote->refresh(), StatusLote::Baixado);
            }
        }
    }

    /**
     * @param list<Bem> $bens
     * @param list<int> $secretarias
     * @param array<string, int> $totais
     */
    private function criarTransferencias(array $bens, array $secretarias, User $usuario, array &$totais): void
    {
        $servico = app(TransferenciaService::class);
        // Bens fora de lote anunciados: um fica só anunciado, outros seguem o fluxo.
        foreach ($bens as $i => $bem) {
            $transferencia = $servico->anunciar($bem->refresh(), $usuario, 'Bem em bom estado, disponível para outras secretarias.');
            $totais['transferencias']++;
            if ($i === 0) {
                continue;
            }
            // A solicitação pelo Service exige um usuário lotado em outra secretaria, e os usuários de demonstração
            // não têm lotação: o pedido é gravado direto, com a secretaria seguinte como destino. Aprovar e recusar
            // passam pelo Service.
            $destino = $secretarias[(array_search($transferencia->secretaria_origem_unit_id, $secretarias, true) + 1) % count($secretarias)];
            $transferencia->update([
                'status' => StatusTransferencia::Solicitado, 'secretaria_destino_unit_id' => $destino,
                'solicitado_por' => $usuario->id, 'data_solicitacao' => now()->subDays(2),
            ]);
            if ($i === 1 || $i === 2) {
                $servico->aprovar($transferencia, $usuario);
            } elseif ($i === 3) {
                $servico->recusar($transferencia, $usuario, 'A secretaria de origem precisa do bem até o fim do exercício.');
            }
        }
    }

    private function idSituacao(string $nome): int
    {
        return (int) DB::table('inservivel_situacoes')->where('nome', $nome)->value('id');
    }

    protected function gerarCpf(int $base): string
    {
        $d = str_split(str_pad((string) ($base % 1000000000), 9, '0', STR_PAD_LEFT));
        foreach ([10, 11] as $peso) {
            $soma = 0;
            foreach ($d as $i => $n) {
                $soma += (int) $n * ($peso - $i);
            }
            $resto = ($soma * 10) % 11;
            $d[] = (string) ($resto === 10 ? 0 : $resto);
        }

        return implode('', $d);
    }

    protected function gerarCnpj(int $base): string
    {
        $d = str_split(str_pad((string) ($base % 100000000), 8, '0', STR_PAD_LEFT) . '0001');
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $pesos) {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += (int) $d[$i] * $peso;
            }
            $resto = $soma % 11;
            $d[] = (string) ($resto < 2 ? 0 : 11 - $resto);
        }

        return implode('', $d);
    }

    private function informar(string $mensagem, bool $aviso = false): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $aviso ? $this->command->warn($mensagem) : $this->command->info($mensagem);
        }
    }
}
