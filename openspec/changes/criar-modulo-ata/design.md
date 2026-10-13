# Design — Módulo Ata

## Contexto

Referência funcional: o sistema PHP de atas (`systema/ata`, só leitura). Decisões do usuário em 2026-10-12:

- D1. **Secretarias = Organograma** (`org_units`). O módulo guarda só a configuração por unidade: sigla e papel timbrado.
- D2. **Assinantes = Cadastro de Pessoas**, com a opção de nome avulso (fora do cadastro).
- D3. **IA = Gemini** (`gemini-2.5-flash`), com chave em `GEMINI_API_KEY` no `.env`, nunca no código.
- D4. **PDF gerado no servidor** (dompdf) e guardado no storage privado do tenant.
- D5. **Padrão de ata** (regra fixa do usuário para todo sistema): rascunho trava o texto; quem assinou sai da seleção; preview do PDF; imprimir; finalizar e salvar PDF.

## Modelo de dados (todas as tabelas com `tenant_id`)

- `ata_tipos`: id, nome, ativo.
- `ata_secretaria_configs`: org_unit_id (único por tenant), sigla, timbrado_path (imagem jpg/png, usada como fundo do PDF).
- `atas`: id, org_unit_id, tipo_id, numero (seq.), ano, titulo, conteudo_html, data_reuniao, local, cidade, redator, sigilosa (bool), status (`em_redacao|rascunho|finalizada`), codigo_validacao (único, gerado ao criar), pdf_path, pdf_sha256, criado_por, finalizada_por, finalizada_em, timestamps.
- `ata_participantes`: id, ata_id, pessoa_id (nullable), nome, cargo (nullable), ordem, assinatura_path (nullable), assinado_em, assinado_registrado_por.

**Numeração:** `numero` é atribuído ao criar, por (tenant, org_unit, ano), com lock pessimista (`lockForUpdate`) no maior número da unidade/ano. A exclusão não renumera nada (diferente do PHP, que usava `COUNT`).

**Código de validação:** `ATA-{ano}-{16 hex aleatórios}`, gerado com `random_bytes` (não um md5 previsível).

## Ciclo de vida (D5)

```
em_redacao ──salvarRascunho──▶ rascunho ──finalizar──▶ finalizada
   (texto editável)          (texto travado,          (imutável, PDF
                              só assinaturas)           guardado)
```

- `PUT /atas/{id}/conteudo` e a edição de metadados/participantes só são aceitos em `em_redacao` (a regra vale no Service, não só na UI). A tentativa fora desse estado retorna 409.
- `POST /atas/{id}/rascunho` grava o texto final e muda para `rascunho`. Não há volta para `em_redacao` (regra do usuário: depois do rascunho, só assinar).
- `POST /atas/{id}/assinaturas` é aceito só em `rascunho` (assina-se o texto já travado), para um participante ainda **sem** assinatura. Assinatura repetida retorna 409. O endpoint de participantes pendentes devolve só os que não assinaram; a caixa de seleção do front usa essa lista.
- `POST /atas/{id}/finalizar` exige `rascunho` e todos os participantes assinados. Gera o PDF, guarda path + sha256 e muda para `finalizada`.
- Exclusão: só em `em_redacao`/`rascunho` e com `ata.manage`. A ata finalizada nunca é excluída.

## PDF (D4)

- Blade `ata::pdf` renderizado por dompdf (A4). O timbrado da secretaria entra como fundo, embutido em base64. O conteúdo HTML passa por sanitização (lista branca: p, br, strong, b, em, i, u, s, ul, ol, li, div, span com style de cor/alinhamento). Rodapé com "Página X de Y", QR Code (`chillerlan/php-qrcode`, já no composer) e o código.
- `GET /atas/{id}/preview.pdf`: gera o PDF em tempo real, com a marca d'água "RASCUNHO — NÃO FINALIZADO", sem guardar.
- `GET /atas/{id}/pdf`: entrega o arquivo guardado (só para a ata finalizada).
- **Imprimir**: o front abre o PDF (preview ou final) num iframe e chama `print()`. Assim a impressão sai idêntica ao PDF.

## Redação

- Editor: `contentEditable` com barra de ferramentas (negrito, itálico, sublinhado, tachado, listas, alinhamento, limpar formatação, cor preta/vermelha), num componente `EditorAta` do módulo.
- Digitação por voz: Web Speech API (`pt-BR`, contínua, só os resultados finais), 100% no navegador. Aviso quando o navegador não oferece suporte.
- Assistente IA: `MediaRecorder` em blocos de até 15 MB → `POST /atas/{id}/ia` (multipart `audio[]`, `modo` 1–5) → `AtaIaService` envia para a File API do Gemini e chama `generateContent` com os 5 prompts do PHP → devolve HTML sanitizado. O front marca o texto anterior em vermelho e anexa o resultado (comportamento do PHP). Os áudios não são persistidos. Timeout de 180 s. Sem chave, o endpoint retorna 503 e o botão fica desativado.

## Acesso e sigilo

- Permissões: `ata.view`, `ata.create`, `ata.sign`, `ata.finalize`, `ata.manage` (tipos, configuração de secretaria, excluir, editar metadados), `ata.audit`.
- Escopo: o usuário vê as atas das unidades a que está vinculado (`org_unit_users`). Quem tem `ata.manage` vê todas as do tenant.
- **Sigilosa**: só o autor e quem tem `ata.manage` abrem, listam (o título aparece mascarado como "Ata sigilosa" para os demais da unidade, sem o conteúdo) e baixam o PDF. A validação pública de uma ata sigilosa confirma a autenticidade sem mostrar título nem redator.

## Auditoria

Toda ação grava no `AuditLog` do núcleo (`module = ata`): criar, editar metadados, salvar rascunho, assinar (quem), finalizar, baixar PDF, acessar ata sigilosa, gerar com IA, excluir, cadastros. A tela "Auditoria" do módulo filtra esses registros (`ata.audit`).

**Exceção ao Outbox (CLAUDE.md):** a chamada ao Gemini é síncrona porque o usuário espera o texto na tela. Ela fica isolada no `AtaIaService` (nunca no controller), com timeout e erro tratado. Não altera dados de negócio, então não há o que reprocessar via Outbox.

## Riscos / trade-offs

- dompdf tem CSS limitado. O editor restringe a formatação ao que o dompdf renderiza.
- O áudio é enviado ao Google (Gemini): a tela avisa antes de gravar (LGPD). A chave fica só no servidor.
- Sem integração ICP-Brasil nesta fase: a assinatura é desenhada, e a integridade vem do PDF guardado + sha256 + código.

## Fora do escopo

Assinatura digital ICP, envio por e-mail, versões do texto, migração dos dados do PHP.
