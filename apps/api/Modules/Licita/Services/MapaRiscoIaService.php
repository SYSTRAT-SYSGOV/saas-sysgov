<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use Illuminate\Support\Collection;
use Modules\Licita\Enums\AlocacaoRisco;
use Modules\Licita\Enums\FaseRisco;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Models\Processo;

/**
 * Geração de riscos por IA para o Mapa de Riscos — diferente de
 * DfdIaService/LicitaTextoIaService (texto rico livre), aqui a IA precisa
 * devolver dado ESTRUTURADO (JSON), que é normalizado e validado contra os
 * mesmos enums/limites do MapaRiscoController antes de ser devolvido ao
 * frontend. A equipe de planejamento sempre revisa a sugestão antes de
 * salvar — nada é persistido diretamente por este service (ver
 * MapaRiscoIaController). Além da lista de riscos, também sugere valores
 * para os campos extras (texto/texto_longo) configurados pelo tenant para
 * o Mapa de Riscos (ver CampoConfiguracaoService) — o frontend só usa essa
 * sugestão para preencher campos ainda vazios, nunca sobrescreve o que a
 * equipe já digitou.
 */
final class MapaRiscoIaService
{
    /** Trecho do texto integral de cada documento incluído no prompt (caracteres) — ver DfdIaService::TAMANHO_TRECHO_TEXTO. */
    private const TAMANHO_TRECHO_TEXTO = 1500;

    /** Quantidade de riscos pedida à IA por chamada — o bastante para dar um ponto de partida sem sobrecarregar a revisão manual. */
    private const QUANTIDADE_RISCOS_SUGERIDOS = 5;

    public function __construct(
        private readonly NanoGptClient $client,
        private readonly LegislacaoContextoService $legislacaoContexto,
        private readonly CampoConfiguracaoService $camposConfiguracao,
    ) {}

    /**
     * @return array{riscos: array<int, array<string, mixed>>, campos_extras: array<string, string>, legislacao_utilizada: array<int, array{id: int, tipo: string, numero: string|null, titulo: string}>}
     */
    public function sugerirRiscos(Processo $processo): array
    {
        $dfd = $processo->dfd;
        $etp = $processo->etp;

        $textoReferencia = collect([$processo->objeto, $dfd?->justificativa, $dfd?->objeto, $etp?->conteudo])
            ->filter()
            ->map(fn (string $t): string => strip_tags($t))
            ->implode(' ');
        $legislacao = $this->legislacaoContexto->buscarRelevante($textoReferencia);

        // Só os campos extras de texto (curto ou longo) — os demais tipos
        // (número, data, booleano, seleção) não são sugestões de texto
        // livre que a IA deva "inventar" um valor plausível.
        $config = $this->camposConfiguracao->getAtiva('mapa_riscos');
        $camposTexto = $config === null
            ? []
            : array_values(array_filter($config->campos, fn (array $c): bool => in_array($c['tipo'], ['texto', 'texto_longo'], true)));

        $prompt = $this->montarPrompt($processo, $dfd?->justificativa, $etp?->conteudo, $legislacao, $camposTexto);

        $resultado = $this->client->chatCompletion([
            [
                'role' => 'system',
                'content' => 'Você é um especialista em gestão de riscos de contratações públicas brasileiras '
                    . '(Lei 14.133/2021, art. 22). Responda SEMPRE com um objeto JSON válido, sem markdown, sem '
                    . 'texto antes ou depois do JSON, sem comentários — apenas o objeto.',
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        [$riscos, $camposExtras] = $this->extrairResultado($resultado['content'], $camposTexto);

        return [
            'riscos' => $riscos,
            'campos_extras' => $camposExtras,
            'legislacao_utilizada' => $legislacao->map(fn (LegalDocumento $doc): array => [
                'id' => $doc->id,
                'tipo' => $doc->tipo,
                'numero' => $doc->numero,
                'titulo' => $doc->titulo,
            ])->all(),
        ];
    }

    /**
     * @param Collection<int, LegalDocumento> $legislacao
     * @param array<int, array{key: string, label: string, tipo: string, ajuda?: string}> $camposTexto
     */
    private function montarPrompt(Processo $processo, ?string $justificativaDfd, ?string $conteudoEtp, Collection $legislacao, array $camposTexto): string
    {
        $linhas = [];
        $linhas[] = 'Identifique ' . self::QUANTIDADE_RISCOS_SUGERIDOS . ' riscos relevantes para o Mapa de Riscos '
            . '(art. 22 da Lei 14.133/2021) da contratação pública descrita abaixo, cobrindo as fases de '
            . 'planejamento, seleção do fornecedor e gestão contratual.';
        $linhas[] = '';
        $linhas[] = "Objeto da contratação: {$processo->objeto}";

        if (filled($justificativaDfd)) {
            $linhas[] = '';
            $linhas[] = 'Justificativa da contratação (DFD): ' . mb_substr(strip_tags($justificativaDfd), 0, self::TAMANHO_TRECHO_TEXTO);
        }

        if (filled($conteudoEtp)) {
            $linhas[] = '';
            $linhas[] = 'Estudo Técnico Preliminar (ETP): ' . mb_substr(strip_tags($conteudoEtp), 0, self::TAMANHO_TRECHO_TEXTO);
        }

        if ($legislacao->isNotEmpty()) {
            $linhas[] = '';
            $linhas[] = 'Considere também a legislação cadastrada na plataforma abaixo, quando pertinente:';
            foreach ($legislacao as $doc) {
                $referencia = trim(($doc->tipo !== 'outro' ? ucfirst($doc->tipo) . ' ' : '') . ($doc->numero ?? ''));
                $linhas[] = "- {$doc->titulo}" . ($referencia !== '' ? " ({$referencia})" : '');
            }
        }

        $linhas[] = '';
        $linhas[] = 'Responda APENAS com um objeto JSON (sem markdown, sem texto fora do objeto) no formato:';
        $linhas[] = '{ "riscos": [ ... ], "campos_extras": { ... } }';
        $linhas[] = '';
        $linhas[] = '"riscos" é um array de objetos, cada um com exatamente estas chaves:';
        $linhas[] = '- "descricao": string, descrição objetiva do risco (máx. 2 frases);';
        $linhas[] = '- "fase": uma destas strings exatas: "' . implode('", "', array_column(FaseRisco::cases(), 'value')) . '";';
        $linhas[] = '- "probabilidade": número inteiro de 1 a 5;';
        $linhas[] = '- "impacto": número inteiro de 1 a 5;';
        $linhas[] = '- "causa": string curta com a causa raiz do risco;';
        $linhas[] = '- "dano": string curta com a consequência caso o risco se concretize;';
        $linhas[] = '- "alocacao": uma destas strings exatas: "' . implode('", "', array_column(AlocacaoRisco::cases(), 'value')) . '";';
        $linhas[] = '- "acao_preventiva": string curta com uma ação para reduzir a probabilidade;';
        $linhas[] = '- "responsavel_prevencao": string curta com o PAPEL/FUNÇÃO responsável pela ação preventiva '
            . '(ex.: "Fiscal do Contrato", "Setor de Compras", "Contratada") — NUNCA o nome de uma pessoa real, '
            . 'você não tem essa informação;';
        $linhas[] = '- "acao_contingencia": string curta com uma ação para mitigar o dano caso o risco ocorra;';
        $linhas[] = '- "responsavel_contingencia": string curta com o PAPEL/FUNÇÃO responsável pela ação de '
            . 'contingência (mesma regra do responsavel_prevencao — nunca um nome de pessoa).';
        $linhas[] = 'Não inclua nenhuma chave além dessas em cada risco.';

        if ($camposTexto !== []) {
            $linhas[] = '';
            $linhas[] = '"campos_extras" é um objeto com sugestão de texto para os campos abaixo, específicos '
                . 'deste órgão para o Mapa de Riscos (use a chave exata indicada; se não houver informação '
                . 'suficiente para um campo, pode omiti-lo):';
            foreach ($camposTexto as $campo) {
                $tamanho = $campo['tipo'] === 'texto_longo' ? '1 a 3 parágrafos' : 'uma frase curta';
                $ajuda = filled($campo['ajuda'] ?? null) ? " ({$campo['ajuda']})" : '';
                $linhas[] = "- \"{$campo['key']}\": {$tamanho} — {$campo['label']}{$ajuda}.";
            }
        } else {
            $linhas[] = '';
            $linhas[] = '"campos_extras" deve ser um objeto vazio {} — não há campos extras configurados.';
        }

        $linhas[] = '';
        $linhas[] = 'Não escreva nada antes ou depois do objeto JSON.';

        return implode("\n", $linhas);
    }

    /**
     * Faz o parsing e a normalização defensiva da resposta da IA — o
     * modelo pode devolver o JSON envolto em um bloco de código markdown
     * (```json ... ```) mesmo quando instruído a não fazer isso, ou omitir/
     * errar algum valor de enum, então tudo é validado/corrigido aqui antes
     * de chegar ao frontend (nunca confiamos cegamente na saída da IA).
     *
     * @param array<int, array{key: string, label: string, tipo: string}> $camposTexto
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, string>}
     */
    private function extrairResultado(string $conteudo, array $camposTexto): array
    {
        $json = trim($conteudo);
        // Remove um possível bloco de código markdown (```json ... ``` ou ``` ... ```).
        if (str_starts_with($json, '```')) {
            $json = preg_replace('/^```[a-zA-Z]*\s*/', '', $json);
            $json = preg_replace('/\s*```$/', '', (string) $json);
        }

        $decodificado = json_decode((string) $json, true);
        // Compatibilidade defensiva: se o modelo devolver só o array de
        // riscos (formato antigo), sem o envelope {riscos, campos_extras}.
        if (is_array($decodificado) && array_is_list($decodificado)) {
            $decodificado = ['riscos' => $decodificado, 'campos_extras' => []];
        }
        if (!is_array($decodificado) || !isset($decodificado['riscos']) || !is_array($decodificado['riscos'])) {
            throw new AiException('O provedor de IA retornou uma resposta em formato inesperado.');
        }

        $fasesValidas = array_column(FaseRisco::cases(), 'value');
        $alocacoesValidas = array_column(AlocacaoRisco::cases(), 'value');

        $riscos = [];
        foreach ($decodificado['riscos'] as $item) {
            if (!is_array($item) || !isset($item['descricao']) || !is_string($item['descricao']) || trim($item['descricao']) === '') {
                continue;
            }

            $riscos[] = [
                'descricao' => mb_substr(trim($item['descricao']), 0, 1000),
                'fase' => in_array($item['fase'] ?? null, $fasesValidas, true) ? $item['fase'] : FaseRisco::Planejamento->value,
                'probabilidade' => $this->normalizarEscala($item['probabilidade'] ?? 3),
                'impacto' => $this->normalizarEscala($item['impacto'] ?? 3),
                'causa' => $this->normalizarTexto($item['causa'] ?? null, 2000),
                'dano' => $this->normalizarTexto($item['dano'] ?? null, 2000),
                'alocacao' => in_array($item['alocacao'] ?? null, $alocacoesValidas, true) ? $item['alocacao'] : AlocacaoRisco::Compartilhado->value,
                'acao_preventiva' => $this->normalizarTexto($item['acao_preventiva'] ?? null, 2000),
                'responsavel_prevencao' => $this->normalizarTexto($item['responsavel_prevencao'] ?? null, 255),
                'acao_contingencia' => $this->normalizarTexto($item['acao_contingencia'] ?? null, 2000),
                'responsavel_contingencia' => $this->normalizarTexto($item['responsavel_contingencia'] ?? null, 255),
            ];
        }

        if ($riscos === []) {
            throw new AiException('A IA não retornou nenhum risco válido. Tente novamente.');
        }

        $chavesValidas = array_column($camposTexto, 'key');
        $camposExtrasResposta = is_array($decodificado['campos_extras'] ?? null) ? $decodificado['campos_extras'] : [];
        $camposExtras = [];
        foreach ($camposExtrasResposta as $chave => $valor) {
            if (!in_array($chave, $chavesValidas, true)) {
                continue;
            }
            $campo = collect($camposTexto)->firstWhere('key', $chave);
            $limite = ($campo['tipo'] ?? 'texto') === 'texto_longo' ? 5000 : 500;
            $texto = $this->normalizarTexto($valor, $limite);
            if ($texto !== null) {
                $camposExtras[$chave] = $texto;
            }
        }

        return [$riscos, $camposExtras];
    }

    private function normalizarEscala(mixed $valor): int
    {
        $numero = is_numeric($valor) ? (int) $valor : 3;

        return max(1, min(5, $numero));
    }

    private function normalizarTexto(mixed $valor, int $tamanhoMaximo): ?string
    {
        if (!is_string($valor) || trim($valor) === '') {
            return null;
        }

        return mb_substr(trim($valor), 0, $tamanhoMaximo);
    }
}
