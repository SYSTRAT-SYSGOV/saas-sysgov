<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Cursos\Enums\TipoCertificado;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Pessoas\Support\Documento;

/**
 * Emissão avulsa de certificados (design D7): o Administrador emite para pessoas (ou empresas)
 * informadas à mão ou por CSV num curso, sem turma, presença ou avaliação. Cada linha é tratada
 * na sua própria transação — uma linha recusada não derruba as demais — e emitir de novo para a
 * mesma pessoa, curso e data devolve o certificado existente.
 */
final class EmissaoAvulsaService
{
    public const MAX_LINHAS = 1000;

    public function __construct(
        private readonly CertificadoService $certificados,
        private readonly ParticipantePessoaService $participantes,
        private readonly EmpresaService $empresas,
    ) {}

    /**
     * @param list<array{nome?: string|null, email?: string|null, documento?: string|null, concluido_em?: string|null, empresa_id?: int|null, empresa_cnpj?: string|null}> $pessoas
     * @return array{emitidos: list<array{linha: int, certificado_id: int, codigo: string, nome: string}>, existentes: list<array{linha: int, certificado_id: int, codigo: string, nome: string}>, recusadas: list<array{linha: int, motivo: string}>}
     */
    public function emitir(Curso $curso, array $pessoas, ?ModeloCertificado $modelo = null, ?string $conclusaoPadrao = null): array
    {
        if (count($pessoas) > self::MAX_LINHAS) {
            throw new DomainException('Envie no máximo ' . self::MAX_LINHAS . ' pessoas por vez.');
        }
        $modelo ??= $curso->modeloCertificado ?? ModeloCertificado::query()->where('padrao', true)->first();
        if ($modelo === null) {
            throw new DomainException('Não há modelo de certificado para este curso: vincule um modelo ao curso ou defina um modelo padrão.');
        }

        $resultado = ['emitidos' => [], 'existentes' => [], 'recusadas' => []];
        foreach ($pessoas as $i => $pessoa) {
            $linha = $i + 1;
            try {
                [$tipo, $certificado] = DB::transaction(fn (): array => $this->emitirUma($curso, $modelo, $pessoa, $conclusaoPadrao));
                $resultado[$tipo][] = ['linha' => $linha, 'certificado_id' => $certificado->id, 'codigo' => $certificado->codigoFormatado(), 'nome' => (string) ($certificado->dados['participante'] ?? '')];
            } catch (DomainException $e) {
                $resultado['recusadas'][] = ['linha' => $linha, 'motivo' => $e->getMessage()];
            }
        }

        return $resultado;
    }

    /**
     * Lê o CSV (NOME obrigatório; EMAIL, DOCUMENTO, CONCLUSAO e EMPRESA_CNPJ opcionais) e emite. Separador `;`
     * ou `,`, UTF-8 com ou sem BOM. A linha 1 é o cabeçalho: as linhas do resultado contam a
     * partir da 2, como na planilha.
     *
     * @return array{emitidos: list<array<string, mixed>>, existentes: list<array<string, mixed>>, recusadas: list<array{linha: int, motivo: string}>}
     */
    public function importar(Curso $curso, UploadedFile $arquivo, ?ModeloCertificado $modelo = null, ?string $conclusaoPadrao = null): array
    {
        $texto = (string) file_get_contents((string) $arquivo->getRealPath());
        $texto = (string) preg_replace('/^\xEF\xBB\xBF/', '', $texto);
        $linhas = array_values(array_filter(preg_split('/\r\n|\r|\n/', $texto) ?: [], fn (string $l): bool => trim($l) !== ''));
        if ($linhas === []) {
            throw new DomainException('O arquivo está vazio.');
        }

        $separador = substr_count($linhas[0], ';') >= substr_count($linhas[0], ',') ? ';' : ',';
        $cabecalho = array_map(fn ($c): string => mb_strtoupper(trim((string) $c), 'UTF-8'), str_getcsv($linhas[0], $separador));
        if (!in_array('NOME', $cabecalho, true)) {
            throw new DomainException('Cabeçalho obrigatório ausente: NOME.');
        }

        $pessoas = [];
        foreach (array_slice($linhas, 1) as $bruta) {
            $valores = str_getcsv($bruta, $separador);
            $campo = fn (string $nome): ?string => ($i = array_search($nome, $cabecalho, true)) !== false ? (trim((string) ($valores[$i] ?? '')) ?: null) : null;
            $pessoas[] = ['nome' => $campo('NOME'), 'email' => $campo('EMAIL'), 'documento' => $campo('DOCUMENTO'), 'concluido_em' => $campo('CONCLUSAO'), 'empresa_cnpj' => $campo('EMPRESA_CNPJ')];
        }

        $resultado = $this->emitir($curso, $pessoas, $modelo, $conclusaoPadrao);
        foreach (['emitidos', 'existentes', 'recusadas'] as $grupo) {
            $resultado[$grupo] = array_map(fn (array $r): array => [...$r, 'linha' => $r['linha'] + 1], $resultado[$grupo]);
        }

        return $resultado;
    }

    /**
     * @param array<string, mixed> $pessoa
     * @return array{0: 'emitidos'|'existentes', 1: Certificado}
     */
    private function emitirUma(Curso $curso, ModeloCertificado $modelo, array $pessoa, ?string $conclusaoPadrao): array
    {
        $nome = trim((string) ($pessoa['nome'] ?? ''));
        if ($nome === '') {
            throw new DomainException('Nome em branco.');
        }
        $conclusao = self::data((string) ($pessoa['concluido_em'] ?? $conclusaoPadrao ?? ''));
        if ($conclusao === null || $conclusao->isFuture()) {
            throw new DomainException("Data de conclusão inválida ou futura ({$nome}).");
        }
        $documento = Documento::somenteDigitos((string) ($pessoa['documento'] ?? ''));
        if ($documento !== '' && !((strlen($documento) === 11 && Documento::valido($documento)) || strlen($documento) === 14)) {
            throw new DomainException("Documento inválido: informe CPF ou CNPJ ({$nome}).");
        }
        $email = trim((string) ($pessoa['email'] ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new DomainException("E-mail inválido ({$nome}).");
        }

        $empresa = $this->empresaInformada($pessoa, $nome);

        $participante = $this->participantes->resolver($nome, $email !== '' ? $email : null, $documento !== '' ? $documento : null);
        // A empresa informada passa a ser a do participante ({EMPRESA}/{CNPJ} no certificado).
        if ($empresa !== null && $participante->empresa_id !== $empresa->id) {
            $participante->update(['empresa_id' => $empresa->id]);
            $participante->setRelation('empresa', $empresa);
        }

        $existente = Certificado::query()->where('curso_id', $curso->id)->where('participante_id', $participante->id)
            ->whereDate('concluido_em', $conclusao->toDateString())->first();
        if ($existente !== null) {
            return ['existentes', $existente];
        }

        try {
            $certificado = $this->certificados->emitir($modelo, $participante, TipoCertificado::Avulso, [
                'curso' => $curso->titulo,
                'carga_horaria_minutos' => (int) $curso->carga_horaria_minutos,
                'inicio' => $conclusao,
                'fim' => $conclusao,
                'responsavel' => $curso->responsavel,
                'conteudo_programatico' => $curso->conteudo_programatico,
                'verso_linhas' => CertificadoService::linhasDoConteudo($curso->conteudo_programatico),
            ], ['curso_id' => $curso->id, 'concluido_em' => $conclusao->toDateString()]);
        } catch (QueryException $e) {
            // Corrida com outra emissão da mesma pessoa/curso/data: o índice único decide.
            $existente = Certificado::query()->where('curso_id', $curso->id)->where('participante_id', $participante->id)
                ->whereDate('concluido_em', $conclusao->toDateString())->first();
            if ($existente === null) {
                throw $e;
            }

            return ['existentes', $existente];
        }

        return ['emitidos', $certificado];
    }

    /** "dd/mm/aaaa" ou "aaaa-mm-dd" → data; inválido → null. */
    private static function data(string $valor): ?Carbon
    {
        foreach (['d/m/Y', 'Y-m-d'] as $formato) {
            $data = \DateTime::createFromFormat('!' . $formato, trim($valor));
            if ($data !== false && $data->format($formato) === trim($valor)) {
                return Carbon::instance($data);
            }
        }

        return null;
    }

    /**
     * Empresa da linha: pelo id (formulário) ou pelo CNPJ (coluna EMPRESA_CNPJ do CSV), sempre da
     * biblioteca do órgão.
     *
     * @param array<string, mixed> $pessoa
     */
    private function empresaInformada(array $pessoa, string $nome): ?Empresa
    {
        if (!empty($pessoa['empresa_id'])) {
            return Empresa::query()->find((int) $pessoa['empresa_id'])
                ?? throw new DomainException("Empresa não encontrada ({$nome}).");
        }
        $cnpj = trim((string) ($pessoa['empresa_cnpj'] ?? ''));
        if ($cnpj === '') {
            return null;
        }

        return $this->empresas->porCnpj($cnpj)
            ?? throw new DomainException("Empresa de CNPJ {$cnpj} não cadastrada ou inativa — cadastre-a na aba Empresas ({$nome}).");
    }
}
