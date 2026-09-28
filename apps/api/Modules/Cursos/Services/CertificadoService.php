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
use Modules\Cursos\Models\Certificado;
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

        $dados = $certificado->dados;
        $url = self::urlValidacao($certificado->codigo);

        return Pdf::loadView('cursos::certificado', [
            'dados' => $dados,
            'codigo' => $certificado->codigoFormatado(),
            'urlValidacao' => $url,
            'qrCode' => (new QRCode(new QROptions(['outputInterface' => QRGdImagePNG::class, 'outputBase64' => true, 'scale' => 6])))->render($url),
            'logotipo' => $this->imagemEmbutida($dados['logotipo_path'] ?? null),
            'assinaturas' => array_map(fn (array $a): array => [...$a, 'imagem' => $this->imagemEmbutida($a['imagem_path'] ?? null)], $dados['assinaturas'] ?? []),
        ])->setPaper('a4', 'landscape')->setOption(['isFontSubsettingEnabled' => true, 'defaultFont' => 'DejaVu Sans'])->output();
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
     * @param array{curso: string, carga_horaria_minutos: int, inicio: Carbon|null, fim: Carbon|null, nota?: string|float|null} $conteudo
     * @param array<string, int> $referencia inscricao_id ou formacao_id
     */
    private function emitir(ModeloCertificado $modelo, Participante $participante, TipoCertificado $tipo, array $conteudo, array $referencia): Certificado
    {
        $orgao = Tenant::query()->whereKey($this->tenantContext->id())->value('name');
        $emissao = now();
        $valores = [
            'participante' => $participante->nome,
            'curso' => $conteudo['curso'],
            'carga_horaria' => self::formatarCargaHoraria($conteudo['carga_horaria_minutos']),
            'periodo' => self::formatarPeriodo($conteudo['inicio'], $conteudo['fim']),
            'data_emissao' => $emissao->format('d/m/Y'),
            'orgao' => (string) $orgao,
            'nota' => self::formatarNota($conteudo['nota'] ?? null),
        ];

        $dados = [
            ...$valores,
            'tipo' => $tipo->value,
            'carga_horaria_minutos' => $conteudo['carga_horaria_minutos'],
            'titulo' => $modelo->titulo,
            'corpo' => ModeloCertificadoService::renderizar($modelo->corpo, $valores),
            'logotipo_path' => $modelo->logotipo_path,
            'assinaturas' => $modelo->assinaturas ?? [],
        ];

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
