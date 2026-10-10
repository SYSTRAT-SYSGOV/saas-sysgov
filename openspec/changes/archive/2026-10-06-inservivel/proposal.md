# Proposal

## Why

A doação de bens inservíveis da prefeitura roda hoje num sistema Laravel separado (`inservivel-main`, publicado em
`veiga.pro.br/inservivel`). Ele tem login próprio para servidores e para entidades, secretarias digitadas à mão e
textos de Araucária fixos no código: município, CNPJ, Lei 3.721/2021, Decreto 43.535/2026 e foro. Também tem
fragilidades:
- a situação do bem é um texto livre, e as regras dependem da grafia exata ("Inservível"/"Inservivel");
- arquivos são servidos por caminho vindo da URL;
- existem rotas públicas de manutenção (backup do banco, limpeza, migração).

Trazer o sistema para o SYSGOV como o módulo **Inservível & Doações** dá a ele o mesmo padrão dos demais módulos:
- um só login, RBAC, isolamento por prefeitura (tenant), auditoria e design system;
- as secretarias e setores do Organograma;
- termos e textos legais configurados por prefeitura, o que permite oferecer o módulo a outros municípios.

## What Changes

- **Novo módulo `Inservivel`** no backend (`apps/api/Modules/Inservivel`) e no painel do cliente
  (`apps/web-client/src/modules/inservivel`), com permissões, três perfis (Gestor do Patrimônio, Servidor de
  Secretaria e Entidade) e o menu "Inservível & Doações".
- **Bens inservíveis**:
  - cadastro com nº patrimonial único por prefeitura, plaqueta antiga, categoria, marca, modelo, série,
    situação, estado de conservação, valores contábil e avaliado, datas e unidade do **Organograma**
    (secretaria e setor);
  - várias fotos por bem;
  - visualizar e editar;
  - filtros de busca;
  - bem nunca é excluído, só muda de situação.
- **Situações por papel**: sete situações de sistema (`inservivel`, `em_avaliacao`, `em_lote`, `doado`, `baixado`,
  `disponivel` e `em_transferencia`, que a prefeitura pode renomear) mais situações livres. As regras usam o papel,
  nunca o nome.
- **Lotes e sorteio**:
  - criação e gestão de lotes de bens inservíveis, com ciclo Aberto → Publicado → Sorteado → Entregue → Baixado;
  - inscrição das entidades habilitadas nos lotes publicados;
  - sorteio com distribuição equitativa (menos lotes ganhos primeiro) e desempate por semente reproduzível;
  - relatório oficial do sorteio em PDF;
  - termos de conferência, entrega e doação com encargo em PDF;
  - anexos do lote.
- **Entidades sem fins lucrativos**:
  - cadastro com documentos exigidos e análise pelo Patrimônio (Pendente, Em Análise, Habilitada, Reprovada,
    Desabilitada);
  - motivo da reprovação e aprovação ou reprovação de cada documento.
- **Portal da entidade**:
  - página pública de cadastro por prefeitura, que cria a entidade e uma conta SYSGOV com o perfil Entidade;
  - depois do login normal, a entidade acompanha o cadastro, reenvia documentos, participa dos lotes e vê os
    resultados e termos dos lotes que ganhou.
- **Transferência interna** entre secretarias:
  - a secretaria anuncia o bem e outra solicita;
  - o Patrimônio aprova ou recusa na tela **Solicitações**, e a aprovação move o bem de unidade;
  - termo de transferência em PDF.
- **Dashboard**: indicadores, últimos bens incorporados e ações rápidas, incluindo as entidades aguardando análise.
- **Parâmetros**: categorias, situações e estados de conservação, com "substituir em massa".
- **Configurações**:
  - dados do doador e legislação citada nos termos;
  - lista de documentos exigidos das entidades;
  - link do cadastro público;
  - **importação da planilha patrimonial** (CSV), que casa o centro de custo com o Organograma e lista as
    pendências.
- Arquivos (fotos, documentos, PDFs) em disco privado, servidos só por rotas que autorizam o objeto. Auditoria de
  todas as alterações e eventos de domínio no Outbox.

Fora desta change:
- migração dos dados do banco do sistema PHP;
- envio real de e-mail (o aviso de reprovação fica no Outbox, como os demais eventos sem consumidor);
- texto editável dos termos;
- rotas de manutenção do PHP (backup, correções, processamento de fotos por pasta).

## Capabilities

### New Capabilities
- `inservivel`: gestão de bens inservíveis municipais — bens e situações por papel, lotes, entidades sem fins
  lucrativos com portal próprio, sorteio equitativo auditável, termos, transferência interna entre secretarias,
  parâmetros, configurações e importação da planilha patrimonial.

### Modified Capabilities
<!-- Nenhuma: Organograma, RBAC e Cadastro de Pessoas são usados como estão, sem mudar seus requisitos. -->

## Impact

- **Backend**: novo módulo `apps/api/Modules/Inservivel` (migrations, models `TenantAware`, controllers, policies,
  serviços, rotas internas, públicas e do portal, seeder de RBAC registrado no `docker-entrypoint.sh`). Usa
  `dompdf` (já instalado) para os PDFs. Os 3 models criados antes desta change são refeitos.
- **Frontend**: novo módulo `apps/web-client/src/modules/inservivel`, rota pública
  `/inservivel/entidades/:tenantSlug/cadastro` no `AppRouter` e contrato em `api.ts` do módulo (padrão da Campanha);
  o `scripts/generate-module-registry.js` passa a ler a permissão de menu do `module.json`.
- **Dados**: tabelas novas `inservivel_*`. Nenhuma tabela existente é alterada.
- **Segurança**: cadastro público com limite de requisições e campo isca, e autorização por objeto no portal da
  entidade.
