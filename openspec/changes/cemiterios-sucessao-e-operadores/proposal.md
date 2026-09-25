# Proposta: Regularização de Sucessão Hereditária e Gestão de Coveiros/Pedreiros

## Por que (Why)

A conclusão da migração do acervo histórico dos cemitérios Central e Independência para o SYSGOV incorporou mais de 9.800 jazigos, 15.500 concessões e 20.000 sepultamentos. Entre esses dados históricos, foram identificadas dezenas de concessões com concessionários falecidos (sinalizados com pendência `sucessao_hereditaria`), além de centenas de registros de sepultamento vinculados a coveiros municipais e pedreiros de obras funerárias.

Atualmente, o sistema bloqueia novos sepultamentos de terceiros em jazigos com titulares falecidos como medida de segurança jurídica, porém não dispõe de um fluxo administrativo formal e rastreável para a **Regularização de Sucessão Hereditária** (apresentação de inventário, partilha, alvará judicial, registro de herdeiros e transferência de titularidade). Da mesma forma, não há um cadastro centralizado para **Gestão de Coveiros e Pedreiros Credenciados**, impedindo o controle de alvarás de pedreiros autônomos, fiscalização de obras particulares e relatórios de produtividade dos coveiros municipais.

## O Que Muda (What Changes)

- **Módulo de Regularização de Sucessão Hereditária**:
  - Criação da entidade e tabela `cemetery_succession_processes` para tramitação de processos administrativos de regularização de concessão.
  - Cadastro de herdeiros concorrentes/requerentes com qualificação civil e documentação comprobatória (formal de partilha, escritura de inventário extrajudicial ou alvará judicial).
  - Emissão de Termo Oficial de Transferência de Concessão Hereditária com numeração sequencial auditável e fé pública municipal.
  - Atualização automática da concessão (`holder_id` transferido para o herdeiro legítimo ou espólio representado) e destravamento automático da trava anti-sepultamento no jazigo (`pendencia_regularizacao = false`).
- **Módulo de Gestão de Coveiros e Pedreiros Credenciados**:
  - Criação da entidade e tabela `cemetery_operators` para controle unificado de profissionais operacionais atuantes nas necrópoles municipais.
  - Diferenciação de tipos: `coveiro` (servidor público municipal ou terceirizado de mão de obra) e `pedreiro` (prestador de serviços particular autônomo credenciado para reforma/construção de túmulos).
  - Controle de credenciamento: matrícula funcional para coveiros; número de alvará municipal, CPF/CNPJ e data de validade do credenciamento para pedreiros.
  - Histórico Operacional: visão consolidada de todas as inumações, exumações e obras em jazigos realizadas por cada profissional, com busca e filtros rápidos.
- **Interface Web (`apps/web-client`)**:
  - Nova aba **"Sucessão Hereditária"** no módulo de cemitérios: lista de concessões com pendência de herança, triagem por necrópole, abertura e deferimento de processos de transferência.
  - Nova aba **"Coveiros e Pedreiros"**: listagem com cards/tabela de profissionais credenciados, status de alvará, modal de novo credenciamento e gaveta lateral (Drawer) com histórico de sepultamentos e obras.
  - Todos os componentes construídos rigorosamente com os primitivos de `@sysgov/ui` e dados técnicos/datas/documentos em `JetBrains Mono` (`font-mono tabular-nums`).

## Capacidades (Capabilities)

### Novas Capacidades (New Capabilities)
- `cemiterio/sucessao-hereditaria`: Processo administrativo para tramitação de herança de concessões jazigares, cadastro de herdeiros, decisão administrativa e emissão de termo de transferência de titularidade.
- `cemiterio/gestao-operadores`: Cadastro, credenciamento, controle de validade de alvará e histórico de serviços executados por coveiros e pedreiros nas necrópoles.

### Capacidades Modificadas (Modified Capabilities)
*(Nenhuma capacidade existente sofre alteração de contrato funcional. As regras existentes de bloqueio preventivo de inumação em `cemiterio/inventario` continuam válidas e serão destravadas após a conclusão do processo de sucessão).*

## Impacto (Impact)

- **Backend (`apps/api/Modules/Cemiterios`)**:
  - Novas migrations com isolamento multi-tenant (`tenant_id` e índices compostos).
  - Novos models: `ProcessoSucessao`, `HerdeiroSucessao`, `OperadorCemiterio`.
  - Novos controllers, rotas e serviços com registro de auditoria (`AuditLogger`) e validações de regras de negócio.
- **Frontend (`apps/web-client`)**:
  - Novas views: `SucessaoView.tsx` e `OperadoresView.tsx`.
  - Novos endpoints no cliente HTTP (`api.ts`).
  - Navegação do App Shell atualizada com as novas abas contextuais da necrópole.
