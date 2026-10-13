# Proposal

## Why

As Fases 1 e 2A do módulo Campanha trouxeram campanhas, municípios, mapa, equipes, captação de eleitores e demandas.
Falta a **operação do dia a dia**, que o CRM PHP de referência (`/politica` e a versão no ar) já cobre e a coordenação
usa para tocar a campanha:

- **Materiais e logística:** o que foi produzido (santinhos, adesivos, bandeiras…), quanto ainda há em estoque e para
  onde cada remessa foi, com quem levou e quem recebeu.
- **Financeiro:** o livro-caixa (receitas e despesas, saldo, centro de custo por município). Decisão do usuário: o
  livro-caixa do PHP **mais os campos da prestação de contas do TSE** (CPF/CNPJ de doador e fornecedor, recibo
  eleitoral, documento fiscal, comprovante anexado, exportação em planilha) — sem gerar o arquivo do SPCE.
- **Agenda:** comícios e eventos, reuniões políticas (com ata e pendências) e visitas de campo às lideranças.
- **Pesquisas eleitorais:** registro das pesquisas internas e externas e a evolução do candidato.

Esta é a **Fase 2B**, que fecha o escopo do CRM PHP no SYSGOV.

## What Changes

- **Materiais:** cadastro de materiais (tipo, nome, fornecedor/gráfica, unidade, valor total do lote em centavos,
  quantidade produzida, peso e volume, imagem) com **estoque** calculado pelas remessas; ao cadastrar, opção de
  **lançar a despesa no financeiro** automaticamente.
- **Logística:** remessas por município (coordenador ou cabo opcional, quantidade, data, transportadora, motorista,
  veículo, previsão), que baixam o estoque; confirmação da entrega (quem recebeu, foto); remessa sem estoque é
  recusada; excluir a remessa devolve ao estoque.
- **Financeiro (livro-caixa + TSE):** lançamentos de receita e despesa com categoria, valor em centavos, data,
  forma de pagamento, centro de custo (município ou campanha geral), fornecedor/doador com **CPF/CNPJ validado**,
  **origem do recurso** (recursos próprios, pessoa física, partido, FEFC, Fundo Partidário, financiamento coletivo,
  outros), **recibo eleitoral** nas receitas, **documento fiscal** (tipo e número) nas despesas e **comprovante
  anexado**. Painel com receitas, despesas, saldo e totais por categoria, origem e município; **exportação em
  planilha** (CSV) com os campos do TSE. Acesso só da **Coordenação Geral** e de um novo perfil **Financeiro de
  Campanha** (decisão do usuário).
- **Agenda:** eventos (nome, município, local, data e hora, responsável, público estimado e presente,
  observações), reuniões (título, município, local, data e hora, participantes, ata, pendências, responsável e
  prazo) e visitas (liderança, município, bairro, data, assunto, resultado e encaminhamento, que pode virar
  **demanda** com um clique). Lista dos próximos compromissos no painel.
- **Pesquisas:** pesquisas internas e externas com instituto, data, abrangência (estadual ou município), margem de
  erro, número de registro no TSE (opcional), **resultado estruturado** (candidatos e percentuais, marcando o da
  campanha) e **gráfico da evolução** do candidato da campanha (decisão do usuário).
- **Comprovantes guardados no sistema** (decisão do usuário): PDF/imagem em armazenamento privado, baixados só por
  quem tem a permissão do recurso.
- **Permissões e perfis:** `campanha.materiais.manage`, `campanha.financeiro.view`, `campanha.financeiro.manage`,
  `campanha.agenda.manage` e `campanha.pesquisas.manage`; perfil novo **Financeiro de Campanha**.

## Capabilities

### New Capabilities
<!-- Nenhuma: tudo pertence à capacidade `campanha`. -->

### Modified Capabilities
- `campanha`: acrescenta materiais e logística, financeiro com os campos da prestação de contas do TSE, agenda
  (eventos, reuniões e visitas), pesquisas eleitorais e comprovantes anexados; amplia as permissões e os perfis.

## Impact

- **Backend (`Modules/Campanha`):** tabelas de materiais, remessas, lançamentos financeiros, eventos, reuniões,
  visitas, pesquisas (com resultados) e anexos; serviços com auditoria e Outbox; rotas na campanha de trabalho;
  upload em disco privado com download autorizado; novas permissões e o perfil Financeiro no seeder; testes.
- **Frontend:** abas Materiais, Financeiro, Agenda e Pesquisas; próximos compromissos e resumo financeiro no painel
  (este só para quem tem a permissão); "Transformar em demanda" a partir da visita.
- **Dinheiro:** sempre em centavos inteiros; nenhum `float`.
- **Fora do escopo:** arquivo do SPCE (sistema do TSE), conciliação bancária, documentos da campanha e fotos de
  eventos (existem no schema do PHP, mas não nas telas da versão no ar).
- **Documentação:** `docs/modules/campanha.md`.
