<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use DomainException;
use Modules\Cursos\Models\Assinatura;

/**
 * Regras do leiaute visual do certificado (design D1/D3). Coordenadas em pontos, a partir do
 * canto superior esquerdo de uma página A4 — as mesmas unidades do construtor no painel e da
 * view do PDF, então nada é convertido entre tela e impressão.
 *
 * Cada elemento é normalizado para um formato fechado: campos desconhecidos são descartados e
 * os opcionais recebem valor padrão, de modo que a view nunca recebe dado cru do cliente.
 */
final class LeiauteCertificado
{
    public const ORIENTACOES = ['paisagem', 'retrato'];

    /** Largura × altura da página A4 em pontos. */
    public const PAGINA = ['paisagem' => [842, 595], 'retrato' => [595, 842]];

    public const TIPOS = ['texto', 'qrcode', 'logotipo', 'assinatura', 'selo'];

    /** Campos que um elemento de texto pode exibir diretamente. */
    public const CAMPOS = ['participante', 'curso', 'carga_horaria', 'periodo', 'data_emissao', 'orgao', 'nota', 'codigo', 'titulo', 'corpo', 'complementar'];

    /** Campos dinâmicos aceitos dentro de um texto livre ({{campo}}). */
    public const CAMPOS_TEXTO_LIVRE = [...ModeloCertificadoService::PLACEHOLDERS, 'codigo'];

    public const FONTES = ['sans', 'serif'];

    public const ALINHAMENTOS = ['esquerda', 'centro', 'direita', 'justificado'];

    public const MAX_ELEMENTOS = 40;

    public const TAMANHO_MIN = 6;

    public const TAMANHO_MAX = 72;

    public const LARGURA_MIN = 10;

    public const MAX_TEXTO = 2000;

    /**
     * Leiaute inicial de um modelo visual novo, na linha do sistema de referência: nome em
     * destaque, texto principal, QR code e código de autenticidade.
     *
     * @return list<array<string, mixed>>
     */
    public static function padrao(string $orientacao = 'paisagem'): array
    {
        [$largura, $altura] = self::PAGINA[$orientacao] ?? self::PAGINA['paisagem'];
        $margem = 60;
        $util = $largura - 2 * $margem;

        return self::normalizarLista([
            ['id' => 'titulo', 'tipo' => 'texto', 'campo' => 'titulo', 'x' => $margem, 'y' => 70, 'largura' => $util, 'tamanho' => 30, 'negrito' => true, 'caixa_alta' => true, 'alinhamento' => 'centro', 'cor' => '#0c326f'],
            ['id' => 'participante', 'tipo' => 'texto', 'campo' => 'participante', 'x' => $margem, 'y' => 170, 'largura' => $util, 'tamanho' => 26, 'negrito' => true, 'caixa_alta' => true, 'alinhamento' => 'centro'],
            ['id' => 'corpo', 'tipo' => 'texto', 'campo' => 'corpo', 'x' => $margem + 40, 'y' => 230, 'largura' => $util - 80, 'tamanho' => 14, 'alinhamento' => 'centro'],
            ['id' => 'qrcode', 'tipo' => 'qrcode', 'x' => $margem, 'y' => $altura - 150, 'largura' => 90],
            ['id' => 'codigo', 'tipo' => 'texto', 'texto' => 'Código de autenticidade: {{codigo}}', 'x' => $margem, 'y' => $altura - 45, 'largura' => 320, 'tamanho' => 9],
        ]);
    }

    /**
     * Valida e normaliza a lista de elementos de um modelo visual.
     *
     * @param mixed $elementos lista vinda do cliente
     * @param list<int> $assinaturasJaUsadas ids referenciados pela versão salva do modelo — uma
     *        assinatura desativada continua valendo onde já estava, mas não entra em elemento novo
     * @return list<array<string, mixed>>
     */
    public static function validar(mixed $elementos, string $orientacao, array $assinaturasJaUsadas = []): array
    {
        if (!in_array($orientacao, self::ORIENTACOES, true)) {
            throw new DomainException('Orientação inválida: use paisagem ou retrato.');
        }
        if (!is_array($elementos) || !array_is_list($elementos)) {
            throw new DomainException('Os elementos do leiaute devem ser uma lista.');
        }
        if (count($elementos) > self::MAX_ELEMENTOS) {
            throw new DomainException('O leiaute aceita no máximo ' . self::MAX_ELEMENTOS . ' elementos.');
        }

        [$largura, $altura] = self::PAGINA[$orientacao];
        $ids = [];
        foreach ($elementos as $i => $elemento) {
            $n = $i + 1;
            if (!is_array($elemento)) {
                throw new DomainException("Elemento {$n}: formato inválido.");
            }
            $tipo = $elemento['tipo'] ?? null;
            if (!in_array($tipo, self::TIPOS, true)) {
                throw new DomainException("Elemento {$n}: tipo desconhecido.");
            }
            $rotulo = "Elemento {$n} ({$tipo})";

            foreach (['x', 'y', 'largura'] as $coordenada) {
                if (!is_int($elemento[$coordenada] ?? null) && !is_float($elemento[$coordenada] ?? null)) {
                    throw new DomainException("{$rotulo}: informe {$coordenada} numérico.");
                }
            }
            $x = (float) $elemento['x'];
            $y = (float) $elemento['y'];
            $w = (float) $elemento['largura'];
            $h = $tipo === 'qrcode' ? $w : 0.0;
            if ($w < self::LARGURA_MIN || $x < 0 || $y < 0 || $x + $w > $largura + 0.5 || $y + $h > $altura + 0.5 || $y >= $altura) {
                throw new DomainException("{$rotulo} está fora da página ({$largura} × {$altura} pt).");
            }

            $id = (string) ($elemento['id'] ?? '');
            if ($id === '' || strlen($id) > 40 || in_array($id, $ids, true)) {
                throw new DomainException("{$rotulo}: identificador ausente, longo demais ou repetido.");
            }
            $ids[] = $id;

            if ($tipo === 'texto') {
                self::validarTexto($elemento, $rotulo);
            }
            if (in_array($tipo, ['assinatura', 'selo'], true)) {
                self::validarAssinatura($elemento, $rotulo, $tipo, $assinaturasJaUsadas);
            }
        }

        $qrcodes = count(array_filter($elementos, fn (array $e): bool => $e['tipo'] === 'qrcode'));
        if ($qrcodes !== 1) {
            throw new DomainException($qrcodes === 0
                ? 'O leiaute precisa do QR code de validação.'
                : 'O leiaute aceita um único QR code de validação.');
        }

        return self::normalizarLista($elementos);
    }

    /**
     * Ids de assinatura referenciados por uma lista de elementos.
     *
     * @param list<array<string, mixed>>|null $elementos
     * @return list<int>
     */
    public static function assinaturasReferenciadas(?array $elementos): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (array $e): int => (int) ($e['assinatura_id'] ?? 0),
            $elementos ?? [],
        ))));
    }

    /**
     * @param array<string, mixed> $elemento
     */
    private static function validarTexto(array $elemento, string $rotulo): void
    {
        $campo = $elemento['campo'] ?? null;
        $texto = $elemento['texto'] ?? null;
        if (($campo === null || $campo === '') === ($texto === null || $texto === '')) {
            throw new DomainException("{$rotulo}: escolha um campo ou escreva um texto livre (um dos dois).");
        }
        if ($campo !== null && $campo !== '' && !in_array($campo, self::CAMPOS, true)) {
            throw new DomainException("{$rotulo}: campo desconhecido.");
        }
        if ($texto !== null && $texto !== '') {
            if (!is_string($texto) || mb_strlen($texto) > self::MAX_TEXTO) {
                throw new DomainException("{$rotulo}: texto livre com até " . self::MAX_TEXTO . ' caracteres.');
            }
            ModeloCertificadoService::textoComCampos($texto, 'no texto livre', self::CAMPOS_TEXTO_LIVRE);
        }

        $tamanho = $elemento['tamanho'] ?? 12;
        if (!is_numeric($tamanho) || $tamanho < self::TAMANHO_MIN || $tamanho > self::TAMANHO_MAX) {
            throw new DomainException("{$rotulo}: tamanho da fonte entre " . self::TAMANHO_MIN . ' e ' . self::TAMANHO_MAX . ' pt.');
        }
        if (isset($elemento['cor']) && !preg_match('/^#[0-9a-fA-F]{6}$/', (string) $elemento['cor'])) {
            throw new DomainException("{$rotulo}: cor inválida (use #rrggbb).");
        }
        if (isset($elemento['fonte']) && !in_array($elemento['fonte'], self::FONTES, true)) {
            throw new DomainException("{$rotulo}: fonte inválida.");
        }
        if (isset($elemento['alinhamento']) && !in_array($elemento['alinhamento'], self::ALINHAMENTOS, true)) {
            throw new DomainException("{$rotulo}: alinhamento inválido.");
        }
    }

    /**
     * @param array<string, mixed> $elemento
     * @param list<int> $assinaturasJaUsadas
     */
    private static function validarAssinatura(array $elemento, string $rotulo, string $tipo, array $assinaturasJaUsadas): void
    {
        $id = (int) ($elemento['assinatura_id'] ?? 0);
        // Busca pelo TenantAware: assinatura de outro órgão simplesmente não existe aqui.
        $assinatura = $id > 0 ? Assinatura::query()->find($id) : null;
        if ($assinatura === null) {
            throw new DomainException("{$rotulo}: assinatura não encontrada.");
        }
        if (!$assinatura->ativa && !in_array($assinatura->id, $assinaturasJaUsadas, true)) {
            throw new DomainException("{$rotulo}: a assinatura \"{$assinatura->nome}\" está inativa e não pode ser adicionada.");
        }
        if ($tipo === 'selo' && $assinatura->selo_path === null) {
            throw new DomainException("{$rotulo}: a assinatura \"{$assinatura->nome}\" não tem selo cadastrado.");
        }
        if ($tipo === 'assinatura') {
            $tamanho = $elemento['tamanho'] ?? 10;
            if (!is_numeric($tamanho) || $tamanho < self::TAMANHO_MIN || $tamanho > self::TAMANHO_MAX) {
                throw new DomainException("{$rotulo}: tamanho da fonte entre " . self::TAMANHO_MIN . ' e ' . self::TAMANHO_MAX . ' pt.');
            }
            if (isset($elemento['cor']) && !preg_match('/^#[0-9a-fA-F]{6}$/', (string) $elemento['cor'])) {
                throw new DomainException("{$rotulo}: cor inválida (use #rrggbb).");
            }
        }
    }

    /**
     * Formato fechado de cada elemento, com os padrões preenchidos.
     *
     * @param list<array<string, mixed>> $elementos
     * @return list<array<string, mixed>>
     */
    private static function normalizarLista(array $elementos): array
    {
        return array_map(function (array $e): array {
            $base = [
                'id' => (string) $e['id'],
                'tipo' => (string) $e['tipo'],
                'x' => round((float) $e['x'], 1),
                'y' => round((float) $e['y'], 1),
                'largura' => round((float) $e['largura'], 1),
            ];

            return match ($e['tipo']) {
                'texto' => [...$base,
                    'campo' => ($e['campo'] ?? '') !== '' ? (string) $e['campo'] : null,
                    'texto' => ($e['texto'] ?? '') !== '' ? trim(strip_tags((string) $e['texto'])) : null,
                    'fonte' => (string) ($e['fonte'] ?? 'sans'),
                    'tamanho' => round((float) ($e['tamanho'] ?? 12), 1),
                    'cor' => strtolower((string) ($e['cor'] ?? '#1b2a41')),
                    'negrito' => (bool) ($e['negrito'] ?? false),
                    'caixa_alta' => (bool) ($e['caixa_alta'] ?? false),
                    'alinhamento' => (string) ($e['alinhamento'] ?? 'esquerda'),
                ],
                'assinatura' => [...$base,
                    'assinatura_id' => (int) $e['assinatura_id'],
                    'mostrar_textos' => (bool) ($e['mostrar_textos'] ?? true),
                    'tamanho' => round((float) ($e['tamanho'] ?? 10), 1),
                    'cor' => strtolower((string) ($e['cor'] ?? '#1b2a41')),
                ],
                'selo' => [...$base, 'assinatura_id' => (int) $e['assinatura_id']],
                default => $base,
            };
        }, $elementos);
    }
}
