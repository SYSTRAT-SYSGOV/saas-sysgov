# Design

## Context

- Motivação: `proposal.md`. Requisitos: `specs/campanha/spec.md` (delta sobre a capacidade `campanha`).
- Base existente (Fases 1 e 2A, `docs/modules/campanha.md`): campanha de trabalho (`CampanhaContext`,
  `CampanhaAware`, middleware `campanha`, encerrada só consulta), `RegistraMutacao` (auditoria + Outbox), membros e
  `ResolveCampanha::podeAcessar`, municípios pelo código IBGE da base pública (`MunicipioService::municipioDaUf`),
  coordenadores e cabos, demandas (`DemandaService`), exportação CSV auditada (eleitores).
- Referência: telas da versão no ar do CRM PHP — `materiais` (estoque, remessas, "Lançar despesa automaticamente no
  financeiro"), `financeiro` (livro-caixa, extrato, imprimir/Excel; categorias Publicidade e gráfica, Combustível,
  Alimentação, Aluguel/despesas do comitê, Impulsionamento de redes, Pagamento de equipe/cabos, Viagem e
  hospedagem, Doação partidária, Doação pessoa física, Outro), `eventos` (abas eventos, reuniões e visitas) e
  `pesquisas` (resultado em texto livre). Os dados de lá são valores em `DECIMAL`; aqui, centavos.
- Arquivos: o Cursos guarda materiais privados no disco `local` com caminho por tenant e devolve pela API
  (`MaterialService::DISCO_ARQUIVOS`).
- Validação de documento: `ResolucaoPessoaService::cpfValido` (Pessoas) existe; não há validador de CNPJ fora do
  Cemiterios (módulo que o Campanha não pode exigir).

## Goals / Non-Goals

**Goals:**
- Cobrir as telas de materiais, financeiro, agenda e pesquisas do CRM PHP, com as regras que lá faltam (estoque
  consistente, dinheiro exato, documentos validados, comprovantes protegidos).
- Deixar o livro-caixa pronto para alimentar a prestação de contas (planilha com os campos do TSE).
- Isolar o financeiro: quem não tem a permissão não vê valores nem comprovantes.

**Non-Goals:**
- Gerar o arquivo do SPCE, conciliar extrato bancário ou checar limites legais de doação (só os campos).
- Documentos da campanha e fotos de eventos (no schema do PHP, ausentes das telas no ar).
- "Materiais casados" (dobradinha impressa no material): existe no schema do PHP, não nas telas.
- Calendário visual mensal (a agenda é lista por período; pode vir depois).

## Decisions

### D1 — Permissões e o perfil Financeiro
Novas permissões `campanha.materiais.manage`, `campanha.financeiro.view`, `campanha.financeiro.manage`,
`campanha.agenda.manage`, `campanha.pesquisas.manage` no `module.json` e no `CampanhaRbacSeeder`. Coordenação Geral:
todas. Coordenação: materiais, agenda e pesquisas (sem financeiro). Novo perfil-modelo `campanha_financeiro`
("Financeiro de Campanha": `view`, `financeiro.view`, `financeiro.manage`), clonado pelo `ModuleRoleProvisioner` como
os outros; o acesso à campanha continua por membro (D2 da Fase 1). Ver materiais, agenda e pesquisas: `campanha.view`.

### D2 — Materiais, remessas e estoque
`campanha_materiais (tenant_id, campanha_id, tipo, nome, fornecedor, unidade, valor_total_centavos (bigint),
quantidade_produzida, peso_kg, volume_m3 (decimal), observacoes, imagem (caminho), timestamps, softDeletes)` e
`campanha_remessas (tenant_id, campanha_id, material_id, codigo_ibge, coordenador_id, cabo_id, quantidade,
enviada_em (date), transportadora, motorista, veiculo, previsao_entrega, entregue_em, recebido_por, foto (caminho),
observacoes, timestamps)`. **Estoque = produzida − soma das remessas** (calculado, sem coluna `qtd_restante` que o
PHP edita à mão e dessincroniza). Registrar remessa trava o material (`lockForUpdate`) e recusa quantidade acima do
estoque; excluir remessa devolve (o cálculo já devolve). Reduzir a quantidade produzida abaixo do já enviado → 422.
**Valor:** o PHP usa `DECIMAL(10,4)` no unitário porque um santinho custa frações de centavo (R$ 0,035). Aqui o
valor contábil é o **total do lote** em centavos (`valor_total_centavos`, informado — é o que está na nota da
gráfica); o unitário é derivado para exibição (total ÷ quantidade). A despesa automática usa o total, então o
livro-caixa fica exato sem `float` nem casas extras.

### D3 — Despesa automática
`POST /materiais` com `lancar_despesa: true` exige também `campanha.financeiro.manage` (senão 422 com mensagem) e, na
mesma transação, cria o lançamento de despesa (categoria `publicidade_grafica`, fornecedor do material, valor total,
data de hoje, `material_id`). O lançamento continua editável no financeiro.

### D4 — Livro-caixa
`campanha_lancamentos (tenant_id, campanha_id, tipo receita|despesa, categoria, valor_centavos (bigint > 0), data,
forma_pagamento, codigo_ibge null (= campanha geral), contraparte_nome, contraparte_documento (encrypted),
contraparte_documento_hash, origem_recurso, recibo_eleitoral, documento_fiscal_tipo, documento_fiscal_numero,
material_id null, comprovante (caminho), observacoes, timestamps, softDeletes)`. Categorias fixas (as do PHP, por
tipo) e origens do TSE como constantes do model. CPF/CNPJ: só dígitos, validados (`Support/Documento`: CPF pelo
`ResolucaoPessoaService::cpfValido`, CNPJ próprio); guardado criptografado (dado pessoal do doador PF) e devolvido
inteiro só para quem tem `financeiro.view` (que é quem vê o livro-caixa). Totais com `SUM` no banco (inteiros).
Exportação CSV (`;`, UTF-8 com BOM) com os campos do TSE, auditada com a quantidade, como a de eleitores.

### D5 — Comprovantes e imagens
Disco `local` (privado), caminho `campanha/{tenant}/{campanha}/{recurso}/{uuid}.{ext}`; aceitos `pdf,jpg,jpeg,png,
webp`, até 10 MB (`mimes` + `max`). Upload por `POST …/{id}/anexo` (multipart) e download por `GET …/{id}/anexo`,
autorizado pela policy do recurso; trocar o arquivo apaga o anterior; excluir o registro (soft delete) mantém o
arquivo (prova contábil). Nenhuma URL pública.

### D6 — Agenda
Três tabelas (`campanha_eventos`, `campanha_reunioes`, `campanha_visitas`), todas com `codigo_ibge` da UF; evento e
reunião com `inicio` (datetime) e `responsavel_id` (membro ou gestão, mesma regra das demandas); reunião com
`pendencias` e `prazo_pendencias` (vencida = prazo < hoje e pendências não vazias e não marcada como resolvida);
visita com `demanda_id` quando vira demanda (`DemandaService::salvar` reaproveitado, sem duplicar). `GET /agenda`
devolve os três tipos normalizados (`tipo, id, titulo, inicio, municipio`) para a lista e para "próximos
compromissos" do painel.

### D7 — Pesquisas
`campanha_pesquisas (tenant_id, campanha_id, tipo interna|externa, instituto, divulgada_em, codigo_ibge null
(= estadual), margem_erro_decimos (inteiro, 2,5% → 25), amostra, registro_tse, observacoes, timestamps,
softDeletes)` e `campanha_pesquisa_resultados (pesquisa_id, nome, partido, percentual_decimos, da_campanha bool,
ordem)`. Percentuais em décimos inteiros (sem `float`), soma ≤ 1000, no máximo um `da_campanha`. Evolução:
`GET /pesquisas/evolucao?codigo_ibge=` devolve `[{divulgada_em, instituto, percentual_decimos}]` do candidato da
campanha. Gráfico de linha com `recharts` (já usado no painel).

### D8 — Telas
Abas **Materiais** (estoque com barra, remessas com status, confirmar entrega com foto), **Financeiro** (só com
`financeiro.view`: indicadores, gráficos por categoria/origem, extrato com filtros, lançamento com comprovante,
exportar), **Agenda** (lista por período com os três tipos, fichas, "transformar em demanda") e **Pesquisas** (lista,
ficha com tabela de resultados editável e gráfico de evolução). No **Painel**: próximos compromissos para todos e
saldo do caixa só para quem tem `financeiro.view` (o endpoint do painel não muda; o front pede o resumo financeiro à
parte e só se tiver a permissão).

## Risks / Trade-offs

- [Estoque divergente por edição concorrente] → estoque calculado e remessa sob `lockForUpdate`.
- [Valor unitário de frações de centavo] → total do lote em centavos é o valor contábil; o unitário é informativo.
- [Arquivos crescem sem limite] → 10 MB por arquivo; exclusão lógica mantém o comprovante (exigência contábil).
- [CPF/CNPJ criptografado impede busca no banco] → filtros por período/tipo/categoria/origem/município; busca por
  nome em texto claro (`contraparte_nome`).
- [Quem cadastra material sem financeiro] → a opção de despesa automática fica oculta e o servidor recusa (D3).

## Migration Plan

1. Migrations novas (aditivas); seeder com as permissões e o perfil `campanha_financeiro` (propaga aos clones).
2. `module:register Campanha` (o boot do container já faz).
3. Sem migração de dados do PHP. Rollback: migrations reversíveis; o perfil novo pode ser removido sem efeito.
