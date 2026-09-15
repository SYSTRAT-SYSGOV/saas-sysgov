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
 * devolver uma lista ESTRUTURADA de riscos (JSON), que é normalizada e
 * validada contra os mesmos enums/limites do MapaRiscoController antes de
 * ser devolvida ao frontend. A equipe de planejamento sempre revisa a
 * sugestão antes de salvar — nada é persistido diretamente por este
 * service (ver MapaRiscoIaController).
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
    ) {}

    /**
     * @return array{riscos: array<int, array<string, mixed>>, legislacao_utilizada: array<int, array{id: int, tipo: string, numero: string|null, titulo: string}>}
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

        $prompt = $this->montarPrompt($processo, $dfd?->justificativa, $etp?->conteudo, $legislacao);

        $resultado = $this->client->chatCompletion([
            [
                'role' => 'system',
                'content' => 'Você é um especialista em gestão de riscos de contratações públicas brasileiras '
                    . '(Lei 14.133/2021, art. 22). Responda SEMPRE com um array JSON válido, sem markdown, sem '
                    . 'texto antes ou depois do JSON, sem comentários — apenas o array.',
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        $riscos = $this->extrairRiscos($resultado['content']);

        return [
            'riscos' => $riscos,
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
     */
    private function montarPrompt(Processo $processo, ?string $justificativaDfd, ?string $conteudoEtp, Collection $legislacao): string
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
        $linhas[] = 'Responda APENAS com um array JSON (sem markdown, sem texto fora do array) de objetos, cada um com exatamente estas chaves:';
        $linhas[] = '- "descricao": string, descrição objetiva do risco (máx. 2 frases);';
        $linhas[] = '- "fase": uma destas strings exatas: "' . implode('", "', array_column(FaseRisco::cases(), 'value')) . '";';
        $linhas[] = '- "probabilidade": número inteiro de 1 a 5;';
        $linhas[] = '- "impacto": número inteiro de 1 a 5;';
        $linhas[] = '- "causa": string curta com a causa raiz do risco;';
        $linhas[] = '- "dano": string curta com a consequência caso o risco se concretize;';
        $linhas[] = '- "alocacao": uma destas strings exatas: "' . implode('", "', array_column(AlocacaoRisco::cases(), 'value')) . '";';
        $linhas[] = '- "acao_preventiva": string curta com uma ação para reduzir a probabilidade;';
        $linhas[] = '- "acao_contingencia": string curta com uma ação para mitigar o dano caso o risco ocorra.';
        $linhas[] = 'Não inclua nenhuma chave além dessas. Não escreva nada antes ou depois do array JSON.';

        return implode("\n", $linhas);
    }

    /**
     * Faz o parsing e a normalização defensiva da resposta da IA — o
     * modelo pode devolver o array envolto em um bloco de código markdown
     * (```json ... ```) mesmo quando instruído a não fazer isso, ou omitir/
     * errar algum valor de enum, então tudo é validado/corrigido aqui antes
     * de chegar ao frontend (nunca confiamos cegamente na saída da IA).
     *
     * @return array<int, array<string, mixed>>
     */
    private function extrairRiscos(string $conteudo): array
    {
        $json = trim($conteudo);
        // Remove um possível bloco de código markdown (```json ... ``` ou ``` ... ```).
        if (str_starts_with($json, '```')) {
            $json = preg_replace('/^```[a-zA-Z]*\s*/', '', $json);
            $json = preg_replace('/\s*```$/', '', (string) $json);
        }

        $decodificado = json_decode((string) $json, true);
        if (!is_array($decodificado)) {
            throw new AiException('O provedor de IA retornou uma resposta em formato inesperado.');
        }

        $fasesValidas = array_column(FaseRisco::cases(), 'value');
        $alocacoesValidas = array_column(AlocacaoRisco::cases(), 'value');

        $riscos = [];
        foreach ($decodificado as $item) {
            if (!is_array($item) || !isset($item['descricao']) || !is_string($item['descricao']) || trim($item['descricao']) === '') {
                continue;
            }

            $riscos[] = [
                'descricao' => mb_substr(trim($item['descricao']), 0, 1000),
                'fase' => in_array($item['fase'] ?? null, $fasesValidas, true) ? $item['fase'] : FaseRisco::Planejamento->value,
                'probabilidade' => $this->normalizarEscala($item['probabilidade'] ?? 3),
                'impacto' => $this->normalizarEscala($item['impacto'] ?? 3),
                'causa' => $this->normalizarTextoCurto($item['causa'] ?? null),
                'dano' => $this->normalizarTextoCurto($item['dano'] ?? null),
                'alocacao' => in_array($item['alocacao'] ?? null, $alocacoesValidas, true) ? $item['alocacao'] : AlocacaoRisco::Compartilhado->value,
                'acao_preventiva' => $this->normalizarTextoCurto($item['acao_preventiva'] ?? null),
                'responsavel_prevencao' => null,
                'acao_contingencia' => $this->normalizarTextoCurto($item['acao_contingencia'] ?? null),
                'responsavel_contingencia' => null,
            ];
        }

        if ($riscos === []) {
            throw new AiException('A IA não retornou nenhum risco válido. Tente novamente.');
        }

        return $riscos;
    }

    private function normalizarEscala(mixed $valor): int
    {
        $numero = is_numeric($valor) ? (int) $valor : 3;

        return max(1, min(5, $numero));
    }

    private function normalizarTextoCurto(mixed $valor): ?string
    {
        if (!is_string($valor) || trim($valor) === '') {
            return null;
        }

        return mb_substr(trim($valor), 0, 2000);
    }
}
