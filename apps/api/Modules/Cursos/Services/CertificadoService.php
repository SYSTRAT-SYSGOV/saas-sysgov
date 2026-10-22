<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Models\Tenant;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Barryvdh\DomPDF\Facade\Pdf;
use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use DomainException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Enums\StatusInscricao;
use Modules\Cursos\Enums\TipoCertificado;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Participante;

/**
 * Emissão, revogação e PDF de certificados (design D8).
 *
 * `dados` guarda o snapshot do que foi impresso na emissão: mudar o curso,
 * o participante ou o modelo depois não altera um certificado já emitido.
 */
final class CertificadoService
{
    /** Crockford base32: sem I, L, O e U — evita confusão na digitação do código. */
    private const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    private const TAMANHO_CODIGO = 12;

    private const TENTATIVAS = 3;

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
    ) {}

    /**
     * Emite o certificado de uma inscrição concluída. Devolve null quando não há
     * modelo aplicável (fica pendente; ver emitirPendentes).
     */
    public function emitirParaInscricao(Inscricao $inscricao): ?Certificado
    {
        if (!$inscricao->statusEnum()->is(StatusInscricao::Concluida)) {
            throw new DomainException('Só inscrições concluídas recebem certificado.');
        }
        if ($inscricao->certificado()->exists()) {
            return $inscricao->certificado;
        }

        $turma = $inscricao->turma;
        $curso = $turma->curso;
        $modelo = $curso->modeloCertificado ?? $this->modeloPadrao();
        if ($modelo === null) {
            return null;
        }

        return $this->emitir($modelo, $inscricao->participante, TipoCertificado::Curso, [
            'curso' => $curso->titulo,
            'carga_horaria_minutos' => $curso->carga_horaria_minutos,
            'inicio' => $turma->data_inicio,
            'fim' => $turma->data_fim,
            // Só cursos com nota mínima imprimem a nota (spec); nos demais, e nas formações, vale o travessão.
            'nota' => $curso->nota_minima !== null ? $inscricao->nota_apurada : null,
            'responsavel' => $curso->responsavel,
            'conteudo_programatico' => $curso->conteudo_programatico,
            'verso_linhas' => self::linhasDoConteudo($curso->conteudo_programatico),
        ], ['inscricao_id' => $inscricao->id]);
    }

    /**
     * Verifica, para o participante, cada formação que contém algum dos
     * cursos informados, e emite o certificado das que ele concluiu
     * (todos os obrigatórios com inscrição concluída).
     *
     * @param list<int> $cursoIds
     * @return array{emitidos: list<Certificado>, pendentes: list<int>} pendentes = ids de formações concluídas sem modelo
     */
    public function verificarFormacoes(Participante $participante, array $cursoIds): array
    {
        $resultado = ['emitidos' => [], 'pendentes' => []];

        $formacoes = Formacao::query()->whereHas('cursos', fn ($q) => $q->whereIn('cursos_cursos.id', $cursoIds))->with('cursos')->get();
        foreach ($formacoes as $formacao) {
            $concluidas = $this->inscricoesConcluidas($participante, $formacao->cursos->pluck('id')->all());
            $obrigatorios = $formacao->cursos->filter(fn ($c) => (bool) data_get($c, 'pivot.obrigatorio'))->pluck('id');
            if ($obrigatorios->diff($concluidas->keys())->isNotEmpty()) {
                continue;
            }
            if (Certificado::query()->where('formacao_id', $formacao->id)->where('participante_id', $participante->id)->exists()) {
                continue;
            }

            $modelo = $formacao->modeloCertificado ?? $this->modeloPadrao();
            if ($modelo === null) {
                $resultado['pendentes'][] = $formacao->id;
                continue;
            }

            $resultado['emitidos'][] = $this->emitir($modelo, $participante, TipoCertificado::Formacao, [
                'curso' => $formacao->titulo,
                // Soma das cargas dos cursos concluídos que compõem a formação (spec).
                'carga_horaria_minutos' => $formacao->cursos->whereIn('id', $concluidas->keys())->sum('carga_horaria_minutos'),
                'inicio' => $concluidas->min(fn (Inscricao $i) => $i->turma->data_inicio),
                'fim' => $concluidas->max(fn (Inscricao $i) => $i->turma->data_fim),
                // Verso da formação: cada curso concluído com a sua carga horária.
                'verso_linhas' => $formacao->cursos->whereIn('id', $concluidas->keys())
                    ->map(fn ($c): string => $c->titulo . ' — ' . self::formatarCargaHoraria((int) $c->carga_horaria_minutos))
                    ->values()->all(),
                'verso_titulo' => 'Cursos da formação',
                'conteudo_programatico' => $formacao->cursos->whereIn('id', $concluidas->keys())->pluck('titulo')->implode("\n"),
            ], ['formacao_id' => $formacao->id]);
        }

        return $resultado;
    }

    public function revogar(Certificado $certificado, User $autor, string $motivo): Certificado
    {
        if ($certificado->revogado()) {
            throw new DomainException('Este certificado já está revogado.');
        }

        return DB::transaction(function () use ($certificado, $autor, $motivo): Certificado {
            $certificado->update(['revogado_em' => now(), 'revogado_por' => $autor->id, 'motivo_revogacao' => $motivo]);

            $this->audit->record('cursos', 'certificado.revogado', "Certificado #{$certificado->id}", null, ['codigo' => $certificado->codigo, 'motivo' => $motivo]);
            $this->outbox->publish('cursos.CertificadoRevogado', ['id' => $certificado->id, 'codigo' => $certificado->codigo]);

            return $certificado;
        });
    }

    /** Conteúdo binário do PDF, renderizado a partir do snapshot. */
    public function pdf(Certificado $certificado): string
    {
        if ($certificado->revogado()) {
            throw new DomainException('Certificado revogado não pode ser baixado.');
        }

        return $this->pdfDeDados($certificado->dados, $certificado->codigoFormatado(), self::urlValidacao($certificado->codigo));
    }

    /** HTML que vira o PDF do certificado (o mesmo desenho; útil para conferir o leiaute). */
    public function html(Certificado $certificado): string
    {
        return $this->montarView($certificado->dados, $certificado->codigoFormatado(), self::urlValidacao($certificado->codigo))[0];
    }

    /**
     * PDF de exemplo do modelo (salvo ou com as alterações ainda não salvas do construtor), sem
     * gravar nada: não cria certificado nem consome código.
     */
    public function preVisualizar(ModeloCertificado $modelo, ?Curso $curso = null): string
    {
        $carga = $curso !== null ? (int) $curso->carga_horaria_minutos : 1200;
        $tenant = Tenant::query()->whereKey($this->tenantContext->id())->first(['name', 'city']);
        $valores = [
            'participante' => 'Maria da Silva Exemplo',
            'curso' => $curso !== null ? $curso->titulo : 'Curso de Exemplo',
            'carga_horaria' => self::formatarCargaHoraria($carga),
            'periodo' => now()->subWeek()->format('d/m/Y') . ' a ' . now()->format('d/m/Y'),
            'data_emissao' => now()->format('d/m/Y'),
            'orgao' => (string) $tenant?->name,
            'nota' => '9,50',
            'cpf' => '123.456.789-00',
            'empresa' => 'Empresa Exemplo Ltda.',
            'cnpj' => '00.000.000/0001-00',
            'carga_horas' => self::formatarHoras($carga),
            'data_extenso' => self::dataPorExtenso(now(), $tenant?->city),
            'data_conclusao' => now()->format('d/m/Y'),
            'responsavel' => $curso?->responsavel ?: 'Responsável pelo curso',
            'conteudo_programatico' => trim((string) $curso?->conteudo_programatico),
        ];
        $verso = self::linhasDoConteudo($curso?->conteudo_programatico) ?: ['Introdução e objetivos do curso', 'Módulo 1 — Fundamentos', 'Módulo 2 — Prática supervisionada', 'Avaliação final'];
        $dados = $this->montarDados($modelo, $valores, TipoCertificado::Curso, $carga, $verso, null);

        return $this->pdfDeDados($dados, 'EXEM-PLO0-0000', self::urlValidacao('EXEMPLO00000'));
    }

    /**
     * Renderiza a partir de um snapshot. Snapshot com `leiaute` usa a view visual; os demais (todos
     * os certificados anteriores a esta mudança) seguem na view de leiaute fixo, inalterada.
     *
     * @param array<string, mixed> $dados
     */
    private function pdfDeDados(array $dados, string $codigo, string $url): string
    {
        [$html, $papel, $orientacao] = $this->montarView($dados, $codigo, $url);

        return Pdf::loadHTML($html)->setPaper($papel, $orientacao)
            ->setOption(['isFontSubsettingEnabled' => true, 'defaultFont' => 'DejaVu Sans'])
            ->output();
    }

    /**
     * @param array<string, mixed> $dados
     * @return array{0: string, 1: string|list<int|float>, 2: string} HTML, papel e orientação
     */
    private function montarView(array $dados, string $codigo, string $url): array
    {
        $qrCode = (new QRCode(new QROptions(['outputInterface' => QRGdImagePNG::class, 'outputBase64' => true, 'scale' => 6])))->render($url);
        // {CODIGO_CERTIFICADO} só existe agora: o corpo e o complemento guardam a marcação.
        foreach (['corpo', 'complementar'] as $chave) {
            if (isset($dados[$chave]) && is_string($dados[$chave])) {
                $dados[$chave] = ModeloCertificadoService::renderizar($dados[$chave], ['codigo' => $codigo]);
            }
        }
        $leiaute = $dados['leiaute'] ?? null;
        $orientacao = is_array($leiaute) ? (string) ($leiaute['orientacao'] ?? 'paisagem') : 'paisagem';
        [$largura, $altura] = LeiauteCertificado::PAGINA[$orientacao] ?? LeiauteCertificado::PAGINA['paisagem'];

        $comum = [
            'codigo' => $codigo,
            'urlValidacao' => $url,
            'qrCode' => $qrCode,
            'logotipo' => $this->imagemEmbutida($dados['logotipo_path'] ?? null),
            'largura' => $largura,
            'altura' => $altura,
            'verso' => $dados['verso'] ?? null,
            'versoFundo' => $this->imagemEmbutida($dados['verso']['fundo_path'] ?? null),
        ];

        if (is_array($leiaute)) {
            $valores = [...$dados, 'codigo' => $codigo];
            $html = view('cursos::certificado-visual', [
                ...$comum,
                'titulo' => (string) ($dados['titulo'] ?? 'Certificado'),
                'fundo' => $this->imagemEmbutida($leiaute['fundo_path'] ?? null),
                'elementos' => array_map(fn (array $el): array => $this->elementoParaView($el, $valores), $leiaute['elementos'] ?? []),
            ])->render();
        } else {
            $html = view('cursos::certificado', [
                ...$comum,
                'dados' => $dados,
                'assinaturas' => array_map(fn (array $a): array => [...$a, 'imagem' => $this->imagemEmbutida($a['imagem_path'] ?? null)], $dados['assinaturas'] ?? []),
            ])->render();
        }

        // Papel com exatamente as dimensões do leiaute em pontos (A4 = 842 × 595): com 'a4' o
        // DomPDF usa 841,89 × 595,28 e um contêiner de 842 pt de altura (retrato) transborda
        // para uma página em branco. O modelo padrão segue em 'a4' paisagem, como antes.
        $papel = is_array($leiaute) ? [0, 0, $largura, $altura] : 'a4';

        return [$html, $papel, is_array($leiaute) ? 'portrait' : 'landscape'];
    }

    /**
     * Elemento do snapshot pronto para a view: texto já resolvido e imagens embutidas.
     *
     * @param array<string, mixed> $el
     * @param array<string, mixed> $valores
     * @return array<string, mixed>
     */
    private function elementoParaView(array $el, array $valores): array
    {
        return match ($el['tipo']) {
            'texto' => [...$el, 'conteudo' => $el['campo'] !== null
                ? (string) ($valores[$el['campo']] ?? '')
                : ModeloCertificadoService::renderizar((string) $el['texto'], array_map(fn ($v): string => is_scalar($v) ? (string) $v : '', $valores))],
            'assinatura' => [...$el, 'imagem' => $this->imagemEmbutida($el['imagem_path'] ?? null)],
            'selo' => [...$el, 'imagem' => $this->imagemEmbutida($el['selo_path'] ?? null)],
            default => $el,
        };
    }

    /**
     * Snapshot do que será impresso (design D5/D6): valores, título e corpo renderizados e, no
     * modelo visual, o leiaute com as assinaturas resolvidas (nome, cargo, registro e arquivos da
     * época). O PDF é sempre desenhado a partir disto, nunca do modelo atual.
     *
     * @param array<string, string> $valores
     * @param list<string> $versoLinhas
     * @return array<string, mixed>
     */
    public function montarDados(ModeloCertificado $modelo, array $valores, TipoCertificado $tipo, int $cargaHorariaMinutos, array $versoLinhas, ?string $versoTitulo): array
    {
        // Leiaute do curso (D8): texto atual da biblioteca; os demais modelos usam o próprio texto.
        $texto = $modelo->texto;
        $dados = [
            ...$valores,
            'tipo' => $tipo->value,
            'carga_horaria_minutos' => $cargaHorariaMinutos,
            'titulo' => $texto !== null ? ($texto->tipo_certificado ?: 'Certificado') : $modelo->titulo,
            'corpo' => ModeloCertificadoService::renderizar($texto !== null ? $texto->texto_principal : $modelo->corpo, $valores),
            'complementar' => ModeloCertificadoService::renderizar((string) $texto?->texto_complementar, $valores),
            'logotipo_path' => $modelo->logotipo_path,
            'assinaturas' => $modelo->assinaturas ?? [],
        ];

        if ($modelo->visual()) {
            $elementos = $modelo->elementos ?? [];
            $assinaturas = Assinatura::query()->whereIn('id', LeiauteCertificado::assinaturasReferenciadas($elementos))->get()->keyBy('id');
            $dados['leiaute'] = [
                'orientacao' => $modelo->orientacao,
                'fundo_path' => $modelo->caminhoDoFundo(),
                'elementos' => array_values(array_filter(array_map(function (array $el) use ($assinaturas): ?array {
                    if (!in_array($el['tipo'], ['assinatura', 'selo'], true)) {
                        return $el;
                    }
                    /** @var Assinatura|null $assinatura */
                    $assinatura = $assinaturas->get((int) $el['assinatura_id']);
                    if ($assinatura === null) {
                        return null;
                    }

                    return [...$el, 'nome' => $assinatura->nome, 'linha_cargo' => $assinatura->linhaCargo(), 'imagem_path' => $assinatura->imagem_path, 'selo_path' => $assinatura->selo_path];
                }, $elementos))),
            ];
        }

        $versoLinhas = array_values(array_filter(array_map('trim', $versoLinhas), fn (string $l): bool => $l !== ''));
        if ($modelo->verso_ativo && $versoLinhas !== []) {
            $dados['verso'] = [
                'titulo' => $versoTitulo ?? 'Conteúdo programático',
                'subtitulo' => $valores['curso'] . ' — carga horária de ' . $valores['carga_horaria'],
                'linhas' => $versoLinhas,
                'fundo_path' => $modelo->verso_fundo_path,
            ];
        }

        return $dados;
    }

    /**
     * Linhas do conteúdo programático do curso (uma por tópico).
     *
     * @return list<string>
     */
    public static function linhasDoConteudo(?string $conteudo): array
    {
        return array_values(array_filter(array_map('trim', preg_split('/\R/', (string) $conteudo) ?: []), fn (string $l): bool => $l !== ''));
    }

    public static function urlValidacao(string $codigo): string
    {
        return config('cursos.url_portal') . '/validar-certificado/' . implode('-', str_split($codigo, 4));
    }

    /** Nota com duas casas e vírgula (8,75), ou travessão quando não há nota a imprimir. */
    public static function formatarNota(string|float|null $nota): string
    {
        return $nota === null ? '—' : number_format((float) $nota, 2, ',', '');
    }

    /** Normaliza um código digitado (com ou sem hífens, minúsculas, O/I/L trocados) para o formato gravado. */
    public static function normalizarCodigo(string $digitado): string
    {
        return strtr(strtoupper((string) preg_replace('/[^0-9A-Za-z]/', '', $digitado)), ['O' => '0', 'I' => '1', 'L' => '1']);
    }

    /**
     * @param array{curso: string, carga_horaria_minutos: int, inicio: Carbon|null, fim: Carbon|null, nota?: string|float|null, responsavel?: string|null, conteudo_programatico?: string|null, verso_linhas?: list<string>, verso_titulo?: string} $conteudo
     * @param array<string, int|string> $referencia inscricao_id, formacao_id ou curso_id + concluido_em (avulso)
     */
    public function emitir(ModeloCertificado $modelo, Participante $participante, TipoCertificado $tipo, array $conteudo, array $referencia): Certificado
    {
        $tenant = Tenant::query()->whereKey($this->tenantContext->id())->first(['name', 'city']);
        $emissao = now();
        $empresa = $participante->empresa;
        $valores = [
            'participante' => $participante->nome,
            'curso' => $conteudo['curso'],
            'carga_horaria' => self::formatarCargaHoraria($conteudo['carga_horaria_minutos']),
            'periodo' => self::formatarPeriodo($conteudo['inicio'], $conteudo['fim']),
            'data_emissao' => $emissao->format('d/m/Y'),
            'orgao' => (string) $tenant?->name,
            'nota' => self::formatarNota($conteudo['nota'] ?? null),
            // Variáveis do formato do sistema de referência (D10).
            'cpf' => $participante->cpfFormatado(),
            'empresa' => $empresa?->nomeImpresso() ?? 'Autônomo',
            'cnpj' => $empresa?->cnpjFormatado() ?? '',
            'carga_horas' => self::formatarHoras($conteudo['carga_horaria_minutos']),
            'data_extenso' => self::dataPorExtenso($emissao, $tenant?->city),
            'data_conclusao' => ($conteudo['fim'] ?? $emissao)->format('d/m/Y'),
            'responsavel' => trim((string) ($conteudo['responsavel'] ?? '')),
            'conteudo_programatico' => trim((string) ($conteudo['conteudo_programatico'] ?? '')),
        ];

        $dados = $this->montarDados($modelo, $valores, $tipo, $conteudo['carga_horaria_minutos'], $conteudo['verso_linhas'] ?? [], $conteudo['verso_titulo'] ?? null);

        for ($tentativa = 1; ; $tentativa++) {
            try {
                $certificado = Certificado::create([
                    'codigo' => $this->gerarCodigo(),
                    'tipo' => $tipo->value,
                    'participante_id' => $participante->id,
                    'modelo_id' => $modelo->id,
                    'dados' => $dados,
                    'emitido_em' => $emissao,
                    ...$referencia,
                ]);
                break;
            } catch (QueryException $e) {
                // Colisão de código (~60 bits: raríssima) — gera outro. Qualquer
                // outro erro, ou colisões repetidas, sobe.
                if (!str_contains($e->getMessage(), 'codigo') || $tentativa >= self::TENTATIVAS) {
                    throw $e;
                }
            }
        }

        $this->audit->record('cursos', 'certificado.emitido', "Certificado #{$certificado->id}", null, ['codigo' => $certificado->codigo, 'tipo' => $tipo->value, ...$referencia]);
        $this->outbox->publish('cursos.CertificadoEmitido', ['id' => $certificado->id, 'codigo' => $certificado->codigo, 'participante_id' => $participante->id, ...$referencia]);

        return $certificado;
    }

    private function gerarCodigo(): string
    {
        $codigo = '';
        for ($i = 0; $i < self::TAMANHO_CODIGO; $i++) {
            $codigo .= self::ALFABETO[random_int(0, 31)];
        }

        return $codigo;
    }

    private function modeloPadrao(): ?ModeloCertificado
    {
        return ModeloCertificado::query()->where('padrao', true)->first();
    }

    /**
     * Inscrições concluídas do participante nos cursos informados, uma por curso.
     *
     * @param list<int> $cursoIds
     * @return \Illuminate\Support\Collection<int, Inscricao> chave = curso_id
     */
    private function inscricoesConcluidas(Participante $participante, array $cursoIds): \Illuminate\Support\Collection
    {
        return Inscricao::query()
            ->where('participante_id', $participante->id)
            ->where('status', StatusInscricao::Concluida->value)
            ->whereHas('turma', fn ($q) => $q->whereIn('curso_id', $cursoIds))
            ->with('turma')
            ->orderBy('concluida_em')
            ->get()
            ->keyBy(fn (Inscricao $i): int => $i->turma->curso_id);
    }

    public static function formatarCargaHoraria(int $minutos): string
    {
        $horas = intdiv($minutos, 60);
        $resto = $minutos % 60;

        if ($resto === 0) {
            return $horas === 1 ? '1 hora' : "{$horas} horas";
        }

        return $horas === 0 ? "{$resto} minutos" : sprintf('%dh%02d', $horas, $resto);
    }

    /** {CARGA_HORARIA}: só o número de horas, como no sistema de referência ("20", "1,5"). */
    public static function formatarHoras(int $minutos): string
    {
        return $minutos % 60 === 0 ? (string) intdiv($minutos, 60) : rtrim(rtrim(number_format($minutos / 60, 2, ',', ''), '0'), ',');
    }

    /** {DATA}: "Araucária, 02 de outubro de 2026" (sem cidade cadastrada, só a data). */
    public static function dataPorExtenso(Carbon $data, ?string $cidade): string
    {
        $meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        $texto = $data->format('d') . ' de ' . $meses[$data->month - 1] . ' de ' . $data->format('Y');
        $cidade = trim((string) $cidade);

        return $cidade !== '' ? "{$cidade}, {$texto}" : $texto;
    }

    private static function formatarPeriodo(?Carbon $inicio, ?Carbon $fim): string
    {
        if ($inicio === null || $fim === null) {
            return '';
        }

        return $inicio->isSameDay($fim)
            ? $inicio->format('d/m/Y')
            : $inicio->format('d/m/Y') . ' a ' . $fim->format('d/m/Y');
    }

    private function imagemEmbutida(?string $caminho): ?string
    {
        if ($caminho === null || !Storage::disk('public')->exists($caminho)) {
            return null;
        }

        $mime = Storage::disk('public')->mimeType($caminho) ?: 'image/png';

        return 'data:' . $mime . ';base64,' . base64_encode((string) Storage::disk('public')->get($caminho));
    }
}
