<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\Inumacao;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\LegadoFalecidoIndice;
use Modules\Cemiterios\Models\OcupacaoSubLoteLegado;
use Modules\Cemiterios\Models\SubLoteLegado;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class MigracaoClipperTest extends CemiteriosTestCase
{
    private Tenant $tenant;
    private string $tempDir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('pref-migracao');
        $this->noTenant($this->tenant);

        // Criar estrutura de CSVs temporários simulando os arquivos legados do Clipper
        $this->tempDir = sys_get_temp_dir() . '/clipper_test_' . uniqid();
        $centralDir = $this->tempDir . '/Cemiterio Central';
        mkdir($centralDir, 0777, true);

        // LOTES.csv
        file_put_contents(
            "{$centralDir}/LOTES.csv",
            "CEMITERIO,QUADRA,LOTE,TIPO,GAVETAS,PROCESSO,VALIDADE\n" .
            "01,01,0001,1,2,PROC-1234/2000,2025-12-31\n" .
            "01,01,0002,3,3,PROC-5678/1998,\n"
        );

        // RESPONSA.csv
        file_put_contents(
            "{$centralDir}/RESPONSA.csv",
            "CEMITERIO,QUADRA,LOTE,NOME,RG,CPF_CNPJ,ENDERECO,NUMERO,COMPLEMENTO,CEP,CIDADE,UF,FONE,FALECIDO\n" .
            "01,01,0001,MARIA SILVA [FALECIDO],,12345678909,RUA A,100,,80000000,CIDADE,PR,33334444,S\n" .
            "01,01,0002,JOAO SOUZA,,98765432100,RUA B,200,,80000000,CIDADE,PR,55556666,N\n"
        );

        // DADOS.csv
        file_put_contents(
            "{$centralDir}/DADOS.csv",
            "CEMITERIO,QUADRA,LOTE,NOME,DT_NASC,DT_FALEC,CERTIDAO,CARTORIO,MEDICO,CAUSA_MORTIS,COD_FUNC,COD_PED\n" .
            "01,01,0001,MARIA SILVA,1940-01-01,2024-05-10,CERT-001,1º Cartório,Dr. Silva,Parada,Jose Coveiro,Pedro Pedreiro\n" .
            "01,01,0002,ANTONIO SOUZA,1960-03-15,2023-08-20,CERT-002,2º Cartório,Dr. Santos,Infarto,Carlos Coveiro,Marcos Pedreiro\n"
        );
    }

    protected function tearDown(): void
    {
        // Limpar diretório temporário
        $centralDir = $this->tempDir . '/Cemiterio Central';
        if (is_dir($centralDir)) {
            @unlink("{$centralDir}/LOTES.csv");
            @unlink("{$centralDir}/RESPONSA.csv");
            @unlink("{$centralDir}/DADOS.csv");
            @rmdir($centralDir);
            @rmdir($this->tempDir);
        }
        parent::tearDown();
    }

    public function test_comando_migracao_dry_run_nao_persiste_dados(): void
    {
        $this->artisan('cemiterios:migrar-clipper', [
            '--tenant' => $this->tenant->slug,
            '--path' => $this->tempDir,
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame(0, Cemiterio::count());
        self::assertSame(0, Jazigo::count());
        self::assertSame(0, Concessao::count());
    }

    public function test_comando_migracao_definitivo_persiste_e_recalcula_ocupacao(): void
    {
        $this->artisan('cemiterios:migrar-clipper', [
            '--tenant' => $this->tenant->slug,
            '--path' => $this->tempDir,
            '--necropole' => '01',
        ])->assertSuccessful();

        $this->noTenant($this->tenant);
        self::assertSame(1, Cemiterio::count());
        self::assertSame(2, Jazigo::count());
        self::assertSame(2, Concessionario::count());
        self::assertSame(2, Concessao::count());
        self::assertSame(2, Falecido::count());
        self::assertSame(2, Inumacao::count());

        // Verificar que titular com [FALECIDO] teve a flag ativada
        $titularFalecida = Concessionario::where('nome', 'MARIA SILVA')->firstOrFail();
        self::assertTrue($titularFalecida->titular_falecido);

        // Verificar processo administrativo no jazigo e concessão
        $jazigo1 = Jazigo::where('codigo', 'Q01-L0001')->firstOrFail();
        self::assertSame('PROC-1234/2000', $jazigo1->processo_administrativo);
        self::assertSame(1, $jazigo1->ocupacao);

        // Verificar inumação com dados do coveiro e pedreiro
        $inumacao = Inumacao::where('plot_id', $jazigo1->id)->firstOrFail();
        self::assertSame('Jose Coveiro', $inumacao->coveiro_nome);
        self::assertSame('Pedro Pedreiro', $inumacao->pedreiro_nome);
    }

    public function test_comando_resolve_nome_real_do_coveiro_via_dbf_e_descarta_registro_corrompido(): void
    {
        $centralDir = "{$this->tempDir}/Cemiterio Central";

        // DADOS.csv passa a referenciar códigos numéricos (como no legado real), não nomes diretos.
        file_put_contents(
            "{$centralDir}/DADOS.csv",
            "CEMITERIO,QUADRA,LOTE,NOME,DT_NASC,DT_FALEC,CERTIDAO,CARTORIO,MEDICO,CAUSA_MORTIS,COD_FUNC,COD_PED\n" .
            "01,01,0001,MARIA SILVA,1940-01-01,2024-05-10,CERT-001,1º Cartório,Dr. Silva,Parada,4,2\n"
        );

        $this->escreverDbfCodigoNome("{$centralDir}/FUNCIONA.DBF", [
            [4, 'RAFAEL STARON'],
        ]);
        // Código 1 tem NOME corrompido (bytes de lixo) e deve ser descartado, não propagado.
        $this->escreverDbfCodigoNome("{$centralDir}/PEDREIRO.DBF", [
            [1, "\xAA"],
            [2, 'AUGUSTO BOJAN'],
        ]);

        // FALECIDO.csv: índice legado de ocupação, preservado por decisão do usuário
        // mesmo sendo redundante com DADOS.csv (RN008).
        file_put_contents(
            "{$centralDir}/FALECIDO.csv",
            "CEMITERIO,QUADRA,LOTE\n" .
            "01,01,0001\n" .
            "01,01,0002\n"
        );

        $this->artisan('cemiterios:migrar-clipper', [
            '--tenant' => $this->tenant->slug,
            '--path' => $this->tempDir,
            '--necropole' => '01',
        ])->assertSuccessful();

        $this->noTenant($this->tenant);
        $jazigo1 = Jazigo::where('codigo', 'Q01-L0001')->firstOrFail();
        $inumacao = Inumacao::where('plot_id', $jazigo1->id)->firstOrFail();

        self::assertSame('RAFAEL STARON', $inumacao->coveiro_nome);
        self::assertSame('AUGUSTO BOJAN', $inumacao->pedreiro_nome);

        self::assertSame(2, LegadoFalecidoIndice::count());
        self::assertTrue(
            LegadoFalecidoIndice::where('park_id', $jazigo1->park_id)
                ->where('quadra_legado', '01')
                ->where('lote_legado', '0001')
                ->exists()
        );
    }

    public function test_migra_sublotes_e_ocupacao_exclusivos_de_independencia_com_pendencia_para_orfaos(): void
    {
        $independenciaDir = "{$this->tempDir}/Cemiterio Independencia";
        mkdir($independenciaDir, 0777, true);

        file_put_contents(
            "{$independenciaDir}/LOTES.csv",
            "CEMITERIO,QUADRA,LOTE,TIPO,GAVETAS,PROCESSO,VALIDADE\n" .
            "02,0001,0030,1,1,,\n"
        );

        // Primeiro sub-lote casa com o lote físico 0001/0030 (030A → 030 → 30, igual a 0030 → 30).
        // Segundo sub-lote não tem lote físico correspondente e vira pendência.
        file_put_contents(
            "{$independenciaDir}/TTT.csv",
            "CEMITERIO,QUADRA,LOTE,TIPO,GAVETA,PROCESSO,VALIDADE\n" .
            "02,0001,030A,1,1,123,2025-01-01\n" .
            "02,9999,999A,1,1,0,\n"
        );

        // Só a primeira entrada de OBA casa com o sub-lote criado; a segunda não casa com nada.
        file_put_contents(
            "{$independenciaDir}/OBA.csv",
            "CEMITERIO,QUADRA,LOTE\n" .
            "02,0001,030A\n" .
            "02,9999,999A\n"
        );

        $this->artisan('cemiterios:migrar-clipper', [
            '--tenant' => $this->tenant->slug,
            '--path' => $this->tempDir,
            '--necropole' => 'all',
        ])->assertSuccessful();

        $this->noTenant($this->tenant);

        // Sub-lote com lote físico correspondente foi migrado com processo e validade.
        $jazigoIndependencia = Jazigo::where('codigo', 'Q0001-L0030')->firstOrFail();
        self::assertSame(1, SubLoteLegado::where('plot_id', $jazigoIndependencia->id)->count());
        $sublote = SubLoteLegado::where('plot_id', $jazigoIndependencia->id)->firstOrFail();
        self::assertSame('030A', $sublote->codigo_sublote);
        self::assertSame('123', $sublote->processo_administrativo);
        self::assertNotNull($sublote->validade_concessao);

        // Sub-lote órfão (9999/999A) não gerou registro — só a pendência estatística.
        self::assertSame(1, SubLoteLegado::count());

        // Ocupação preservada apenas para o sub-lote que existe.
        self::assertSame(1, OcupacaoSubLoteLegado::count());
        self::assertTrue(OcupacaoSubLoteLegado::where('sublot_id', $sublote->id)->exists());

        // O Cemitério Central (necrópole 01, fixtures padrão do setUp) nunca aciona esse fluxo.
        $jazigoCentral = Jazigo::where('codigo', 'Q01-L0001')->firstOrFail();
        self::assertSame(0, SubLoteLegado::where('plot_id', $jazigoCentral->id)->count());
    }

    /** @param list<array{0: int, 1: string}> $registros [codigo, nome] */
    private function escreverDbfCodigoNome(string $caminho, array $registros): void
    {
        $campos = [
            ['nome' => 'CODIGO', 'tipo' => 'N', 'tamanho' => 3],
            ['nome' => 'NOME', 'tipo' => 'C', 'tamanho' => 40],
            ['nome' => 'RG', 'tipo' => 'C', 'tamanho' => 15],
        ];
        $recordLen = 1 + array_sum(array_column($campos, 'tamanho'));
        $headerLen = 32 + count($campos) * 32 + 1;

        $conteudo = pack('C', 0x03) . str_repeat("\x00", 3)
            . pack('V', count($registros))
            . pack('v', $headerLen)
            . pack('v', $recordLen)
            . str_repeat("\x00", 20);

        foreach ($campos as $campo) {
            // Reproduz o bug real do legado: bytes de lixo após o terminador nulo do nome.
            $nomeCampo = substr($campo['nome'] . "\x00\xAA\xBB\xCC\xDD\xEE\xFF\x11\x22\x33\x44", 0, 11);
            $conteudo .= $nomeCampo
                . $campo['tipo']
                . str_repeat("\x00", 4)
                . pack('C', $campo['tamanho'])
                . pack('C', 0)
                . str_repeat("\x00", 14);
        }
        $conteudo .= "\x0D";

        foreach ($registros as [$codigo, $nome]) {
            $conteudo .= ' '
                . str_pad((string) $codigo, 3, ' ', STR_PAD_LEFT)
                . str_pad($nome, 40)
                . str_pad('', 15);
        }

        file_put_contents($caminho, $conteudo);
    }
}
