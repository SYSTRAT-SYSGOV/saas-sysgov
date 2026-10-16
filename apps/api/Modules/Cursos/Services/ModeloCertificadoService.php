<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use App\Support\AuditLogger;
use DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\Cursos\Models\ModeloCertificado;

/**
 * Modelos de certificado (design D9): corpo em texto puro com placeholders
 * fixos, renderizado por substituição simples — nunca como template, para
 * não abrir injeção de código.
 *
 * Imagens (logotipo e assinaturas) ganham nome único a cada envio e as
 * antigas NÃO são apagadas: certificados já emitidos apontam para elas no
 * snapshot.
 */
final class ModeloCertificadoService
{
    /** Campos no formato antigo ({{participante}}): continuam valendo nos textos já gravados. */
    public const PLACEHOLDERS = ['participante', 'curso', 'carga_horaria', 'periodo', 'data_emissao', 'orgao', 'nota'];

    /**
     * Variáveis do texto no formato do sistema de referência (D10) → chave do valor em `dados`.
     * São as oferecidas nas telas; {CODIGO_CERTIFICADO} só é conhecida ao desenhar o PDF.
     */
    public const VARIAVEIS = [
        'NOME' => 'participante',
        'CPF' => 'cpf',
        'EMPRESA' => 'empresa',
        'CNPJ' => 'cnpj',
        'CURSO' => 'curso',
        'CARGA_HORARIA' => 'carga_horas',
        'DATA' => 'data_extenso',
        'DATA_CONCLUSAO' => 'data_conclusao',
        'CODIGO_CERTIFICADO' => 'codigo',
        'RESPONSAVEL' => 'responsavel',
        'CONTEUDO_PROGRAMATICO' => 'conteudo_programatico',
    ];

    public const MAX_ASSINATURAS = 3;

    /** Lado maior do fundo depois de salvo: A4 a 300 dpi — nítido na impressão e leve no PDF. */
    public const FUNDO_MAX_PX = 2480;

    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{nome: string, titulo: string, corpo: string, padrao?: bool, assinaturas?: list<array{nome: string, cargo: string}>} $dados
     */
    public function criar(array $dados): ModeloCertificado
    {
        $dados = $this->normalizar($dados);

        return DB::transaction(function () use ($dados): ModeloCertificado {
            if ($dados['padrao'] ?? false) {
                ModeloCertificado::query()->where('padrao', true)->update(['padrao' => false]);
            }
            $modelo = ModeloCertificado::create($dados);
            $this->audit->record('cursos', 'modelo_certificado.criado', "ModeloCertificado #{$modelo->id}", null, $modelo->toArray());

            return $modelo;
        });
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(ModeloCertificado $modelo, array $dados): ModeloCertificado
    {
        $dados = $this->normalizar($dados, $modelo);

        return DB::transaction(function () use ($modelo, $dados): ModeloCertificado {
            if ($dados['padrao'] ?? false) {
                ModeloCertificado::query()->whereKeyNot($modelo->id)->where('padrao', true)->update(['padrao' => false]);
            }
            $antes = $modelo->toArray();
            $modelo->update($dados);
            $this->audit->record('cursos', 'modelo_certificado.atualizado', "ModeloCertificado #{$modelo->id}", $antes, $modelo->toArray());

            return $modelo;
        });
    }

    /**
     * Cópia em memória do modelo com as alterações ainda não salvas do construtor, validadas como
     * num salvamento — usada só para a pré-visualização; nada é gravado.
     *
     * @param array<string, mixed> $dados
     */
    public function previa(ModeloCertificado $modelo, array $dados): ModeloCertificado
    {
        $copia = $modelo->replicate();
        $copia->fill($this->normalizar($dados, $modelo));

        return $copia;
    }

    public function excluir(ModeloCertificado $modelo): void
    {
        DB::transaction(function () use ($modelo): void {
            $antes = $modelo->toArray();
            $modelo->delete();
            $this->audit->record('cursos', 'modelo_certificado.excluido', "ModeloCertificado #{$antes['id']}", $antes, null);
        });
    }

    public function definirLogotipo(ModeloCertificado $modelo, UploadedFile $arquivo): ModeloCertificado
    {
        $antes = $modelo->logotipo_path;
        $modelo->update(['logotipo_path' => $this->guardar($modelo, $arquivo, 'logotipo')]);
        $this->audit->record('cursos', 'modelo_certificado.logotipo', "ModeloCertificado #{$modelo->id}", ['logotipo_path' => $antes], ['logotipo_path' => $modelo->logotipo_path]);

        return $modelo;
    }

    /** Fundo da frente do modelo visual (PNG/JPEG já validados pelo conteúdo no controller). */
    public function definirFundo(ModeloCertificado $modelo, UploadedFile $arquivo): ModeloCertificado
    {
        return $this->definirImagemDeFundo($modelo, 'fundo_path', $arquivo, 'fundo');
    }

    /** Fundo do verso (página de conteúdo programático), para qualquer tipo de modelo. */
    public function definirVersoFundo(ModeloCertificado $modelo, UploadedFile $arquivo): ModeloCertificado
    {
        return $this->definirImagemDeFundo($modelo, 'verso_fundo_path', $arquivo, 'verso-fundo');
    }

    public function definirImagemAssinatura(ModeloCertificado $modelo, int $indice, UploadedFile $arquivo): ModeloCertificado
    {
        $assinaturas = $modelo->assinaturas ?? [];
        if (!isset($assinaturas[$indice])) {
            throw new DomainException('Assinatura inexistente neste modelo — cadastre o nome e o cargo antes de enviar a imagem.');
        }

        $antes = $assinaturas;
        $assinaturas[$indice]['imagem_path'] = $this->guardar($modelo, $arquivo, "assinatura-{$indice}");
        $modelo->update(['assinaturas' => $assinaturas]);
        $this->audit->record('cursos', 'modelo_certificado.assinatura', "ModeloCertificado #{$modelo->id}", ['assinaturas' => $antes], ['assinaturas' => $assinaturas]);

        return $modelo;
    }

    /**
     * Texto puro (sem HTML) cujos campos dinâmicos são todos conhecidos.
     *
     * @param string $onde complemento da mensagem de erro ("no modelo", "no texto principal")
     * @param list<string> $legados campos aceitos no formato antigo {{campo}}
     */
    public static function textoComCampos(string $texto, string $onde, array $legados = self::PLACEHOLDERS): string
    {
        $texto = trim(strip_tags($texto));
        preg_match_all('/\{\{\s*([^}]*?)\s*\}\}/', $texto, $m);
        $desconhecidos = array_values(array_unique(array_diff($m[1], $legados)));
        if ($desconhecidos !== []) {
            throw new DomainException("Campo dinâmico desconhecido {$onde}: {{" . implode('}}, {{', $desconhecidos) . '}}. Use as variáveis: ' . self::listaVariaveis() . '.');
        }
        preg_match_all('/(?<!\{)\{([A-Z][A-Z_]*)\}(?!\})/', $texto, $m);
        $desconhecidas = array_values(array_unique(array_diff($m[1], array_keys(self::VARIAVEIS))));
        if ($desconhecidas !== []) {
            throw new DomainException("Variável desconhecida {$onde}: {" . implode('}, {', $desconhecidas) . '}. Use: ' . self::listaVariaveis() . '.');
        }

        return $texto;
    }

    /** "{NOME}, {CPF}, …" para as mensagens. */
    public static function listaVariaveis(): string
    {
        return '{' . implode('}, {', array_keys(self::VARIAVEIS)) . '}';
    }

    /**
     * Substitui as variáveis ({NOME}) e os campos antigos ({{participante}}) pelos valores, sem
     * nenhuma avaliação de código. Valor ausente deixa a marcação como está (ex.: o código, que só
     * existe ao desenhar o PDF).
     *
     * @param array<string, string> $valores chaves de `dados` (participante, cpf, codigo…)
     */
    public static function renderizar(string $corpo, array $valores): string
    {
        $corpo = (string) preg_replace_callback(
            '/\{\{\s*([a-z_]+)\s*\}\}/',
            fn (array $m): string => $valores[$m[1]] ?? $m[0],
            $corpo,
        );

        return (string) preg_replace_callback(
            '/(?<!\{)\{([A-Z][A-Z_]*)\}(?!\})/',
            fn (array $m): string => isset(self::VARIAVEIS[$m[1]]) ? ($valores[self::VARIAVEIS[$m[1]]] ?? $m[0]) : $m[0],
            $corpo,
        );
    }

    /**
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    private function normalizar(array $dados, ?ModeloCertificado $atual = null): array
    {
        $dados = $this->normalizarLeiaute($dados, $atual);

        if (array_key_exists('corpo', $dados)) {
            $dados['corpo'] = self::textoComCampos((string) $dados['corpo'], 'no modelo');
        }

        if (array_key_exists('assinaturas', $dados)) {
            $novas = $dados['assinaturas'] ?? [];
            if (count($novas) > self::MAX_ASSINATURAS) {
                throw new DomainException('O modelo aceita no máximo ' . self::MAX_ASSINATURAS . ' assinaturas.');
            }
            // Mantém a imagem já enviada de cada posição.
            $anteriores = $atual->assinaturas ?? [];
            $dados['assinaturas'] = array_map(fn (array $a, int $i): array => [
                'nome' => (string) $a['nome'],
                'cargo' => (string) $a['cargo'],
                'imagem_path' => $anteriores[$i]['imagem_path'] ?? null,
            ], $novas, array_keys($novas));
        }

        return $dados;
    }

    /**
     * Tipo, orientação e elementos. Um modelo visual novo sem elementos recebe o leiaute inicial;
     * trocar só a orientação revalida os elementos já salvos contra a página nova.
     *
     * @param array<string, mixed> $dados
     * @return array<string, mixed>
     */
    public function normalizarLeiaute(array $dados, ?ModeloCertificado $atual = null): array
    {
        $tipo = $dados['tipo'] ?? ($atual !== null ? $atual->tipo : ModeloCertificado::TIPO_PADRAO);
        if (!in_array($tipo, [ModeloCertificado::TIPO_PADRAO, ModeloCertificado::TIPO_VISUAL], true)) {
            throw new DomainException('Tipo de modelo inválido: use padrao ou visual.');
        }
        $orientacao = $dados['orientacao'] ?? ($atual !== null ? $atual->orientacao : 'paisagem');

        if ($tipo !== ModeloCertificado::TIPO_VISUAL) {
            // Modelo padrão guarda os elementos que tiver (volta a valer se virar visual de novo),
            // mas não os valida nem os imprime.
            unset($dados['elementos']);

            return $dados;
        }

        $elementos = array_key_exists('elementos', $dados) ? $dados['elementos'] : $atual?->elementos;
        if ($elementos === null || $elementos === []) {
            $dados['elementos'] = LeiauteCertificado::padrao($orientacao);
        } elseif (array_key_exists('elementos', $dados) || array_key_exists('orientacao', $dados) || array_key_exists('tipo', $dados)) {
            $dados['elementos'] = LeiauteCertificado::validar($elementos, $orientacao, LeiauteCertificado::assinaturasReferenciadas($atual?->elementos));
        }

        return $dados;
    }

    private function definirImagemDeFundo(ModeloCertificado $modelo, string $coluna, UploadedFile $arquivo, string $prefixo): ModeloCertificado
    {
        $antes = $modelo->getAttribute($coluna);
        $caminho = "cursos/{$modelo->tenant_id}/certificados/modelo-{$modelo->id}-{$prefixo}-" . Str::random(12) . '.jpg';
        Storage::disk('public')->put($caminho, self::fundoEmJpeg((string) $arquivo->getRealPath()));
        $modelo->update([$coluna => $caminho]);
        $this->audit->record('cursos', "modelo_certificado.{$prefixo}", "ModeloCertificado #{$modelo->id}", [$coluna => $antes], [$coluna => $caminho]);

        return $modelo;
    }

    /**
     * Fundo sempre em JPEG, com o lado maior limitado a FUNDO_MAX_PX: o DomPDF embute JPEG sem
     * decodificar, enquanto um PNG de página inteira é descomprimido em memória (estoura o limite
     * do PHP). Transparência é achatada sobre branco — fundo não precisa dela.
     */
    public static function fundoEmJpeg(string $arquivo): string
    {
        $info = @getimagesize($arquivo);
        $origem = $info === false ? false : ($info[2] === IMAGETYPE_PNG ? @imagecreatefrompng($arquivo) : @imagecreatefromjpeg($arquivo));
        if ($info === false || $origem === false) {
            throw new DomainException('Não foi possível ler a imagem de fundo.');
        }

        $escala = min(1, self::FUNDO_MAX_PX / max($info[0], $info[1]));
        $largura = max(1, (int) round($info[0] * $escala));
        $altura = max(1, (int) round($info[1] * $escala));
        $destino = imagecreatetruecolor($largura, $altura);
        imagefill($destino, 0, 0, (int) imagecolorallocate($destino, 255, 255, 255));
        imagecopyresampled($destino, $origem, 0, 0, 0, 0, $largura, $altura, $info[0], $info[1]);

        ob_start();
        imagejpeg($destino, null, 88);

        return (string) ob_get_clean();
    }

    private function guardar(ModeloCertificado $modelo, UploadedFile $arquivo, string $prefixo): string
    {
        return $arquivo->storeAs(
            "cursos/{$modelo->tenant_id}/certificados",
            "modelo-{$modelo->id}-{$prefixo}-" . Str::random(12) . '.' . ($arquivo->extension() ?: strtolower($arquivo->getClientOriginalExtension())),
            'public',
        );
    }
}
