# Pessoas Specification

## Purpose

Mantém um cadastro único de pessoa física por tenant, separado da conta de acesso ao SYSGOV, servindo de base (master data) para servidores públicos e munícipes consumida por outros módulos do ecossistema.

## Requirements

### Requirement: Cadastro único de pessoa física por tenant
O sistema SHALL manter um cadastro de pessoas físicas por tenant, com o CPF como chave de negócio única dentro do tenant quando informado. O sistema SHALL admitir pessoa física **sem CPF informado**, marcada com o estado `documento_pendente`, e SHALL garantir que duas pessoas nunca compartilhem o mesmo CPF no tenant, nem mesmo depois de regularizadas.

#### Scenario: Cadastro único por tenant
- **WHEN** uma pessoa é cadastrada com CPF já existente no tenant
- **THEN** o sistema rejeita a duplicação e retorna erro de unicidade

#### Scenario: Cadastro sem CPF como documento pendente
- **WHEN** uma pessoa física é cadastrada sem CPF
- **THEN** o sistema salva a pessoa com o estado `documento_pendente`, sem gerar chave de unicidade de documento, e a pessoa fica disponível para vínculo com os módulos

#### Scenario: Várias pessoas com documento pendente no mesmo tenant
- **WHEN** duas pessoas físicas distintas são cadastradas sem CPF no mesmo tenant
- **THEN** o sistema aceita as duas, pois a unicidade só vale para documentos informados

### Requirement: Separação entre identidade civil e conta de acesso
O sistema SHALL representar a identidade civil da pessoa (cadastro) e a conta de acesso ao SYSGOV (usuário) como entidades distintas, em que uma pessoa possui zero ou um usuário vinculado e todo usuário corresponde a exatamente uma pessoa.

#### Scenario: Pessoa sem usuário
- **WHEN** uma pessoa é importada do sistema da prefeitura
- **THEN** ela fica disponível no cadastro sem conta de acesso ao SYSGOV

### Requirement: Vínculos de papel modelados em tabela própria
O sistema SHALL modelar cada papel que uma pessoa exerce (servidor de carreira, estagiário, comissionado, CLT, munícipe, contribuinte, aluno, paciente) como um vínculo em tabela própria, associado à pessoa, e não como um atributo fixo do cadastro da pessoa. Cada vínculo SHALL admitir o registro opcional de uma matrícula funcional.

#### Scenario: Múltiplos vínculos
- **WHEN** uma pessoa é cadastrada como servidor de carreira e depois vinculada como munícipe
- **THEN** o sistema mantém um único cadastro de pessoa com dois vínculos, sem duplicar a pessoa

#### Scenario: Vínculo com vigência
- **WHEN** um vínculo é encerrado (ex.: exoneração de cargo comissionado)
- **THEN** o sistema registra a data de término do vínculo sem excluir o histórico nem a pessoa

#### Scenario: Matrícula funcional registrada no vínculo
- **WHEN** um vínculo de servidor de carreira é cadastrado com uma matrícula funcional
- **THEN** o sistema armazena a matrícula associada a esse vínculo específico, não ao cadastro da pessoa

### Requirement: Documentos, endereços e contatos multivalorados
O sistema SHALL permitir que uma pessoa tenha múltiplos documentos (RG, CNH, título de eleitor), múltiplos endereços e múltiplos contatos (celular, e-mail, telefone), cada um associado à pessoa; entre os contatos de um mesmo tipo, no máximo um SHALL ser marcado como principal. Cada documento SHALL admitir o registro opcional da UF e da data de emissão. Cada contato SHALL registrar se a pessoa autoriza o recebimento de notificações por aquele canal, com valor padrão de autorização concedida.

#### Scenario: Contato principal único por tipo
- **WHEN** um segundo e-mail é marcado como principal para uma pessoa que já tinha um e-mail principal
- **THEN** o sistema desmarca o e-mail principal anterior e mantém apenas o novo como principal

#### Scenario: UF e data de emissão do documento
- **WHEN** um RG é cadastrado informando UF e data de emissão
- **THEN** o sistema armazena esses dados junto ao documento

#### Scenario: Consentimento de notificação por contato
- **WHEN** um contato é cadastrado sem informar explicitamente a autorização de notificações
- **THEN** o sistema considera a autorização concedida por padrão

### Requirement: Exclusão lógica de pessoa
O sistema SHALL excluir uma pessoa de forma lógica (soft delete), nunca removendo fisicamente o registro nem o histórico relacionado (vínculos, documentos, endereços, contatos, promoção a usuário), preservando-os para fins de auditoria.

#### Scenario: Exclusão preserva o histórico
- **WHEN** um administrador exclui uma pessoa que possui vínculos, documentos e um usuário promovido
- **THEN** o sistema marca a pessoa como excluída, deixa de retorná-la em buscas e listagens padrão, e mantém intactos no banco de dados a própria pessoa e todo o seu histórico relacionado

#### Scenario: CPF de pessoa excluída continua bloqueado para reuso
- **WHEN** um administrador tenta cadastrar uma nova pessoa com o mesmo CPF de uma pessoa já excluída logicamente no mesmo tenant
- **THEN** o sistema rejeita a duplicação da mesma forma que rejeitaria para uma pessoa não excluída

### Requirement: Busca e listagem de pessoas
O sistema SHALL permitir localizar pessoas por nome ou CPF e filtrar a listagem por tipo de vínculo, por status da pessoa, por situação vital (falecido ou vivo) e por faixa de data de nascimento e sexo, combinando os filtros entre si. A listagem SHALL incluir os vínculos de cada pessoa retornada, sem exigir uma consulta adicional por pessoa, SHALL permitir ordenação pelas colunas nome, CPF e status, e SHALL permitir a exportação, nos formatos CSV, XLSX e PDF, das linhas resultantes dos filtros aplicados.

#### Scenario: Busca por CPF
- **WHEN** o usuário busca por um CPF válido cadastrado no tenant
- **THEN** o sistema retorna a pessoa correspondente, mesmo que o CPF tenha sido digitado com máscara ou pontuação

#### Scenario: Filtro por tipo de vínculo
- **WHEN** o usuário filtra a listagem pelo vínculo "municipe"
- **THEN** o sistema retorna apenas pessoas com um vínculo desse tipo, incluindo as que também têm outros vínculos

#### Scenario: Listagem traz os vínculos de cada pessoa
- **WHEN** a listagem de pessoas é consultada
- **THEN** cada pessoa retornada inclui seus vínculos, permitindo exibi-los na própria listagem sem uma requisição por pessoa

#### Scenario: Filtro por situação vital
- **WHEN** o usuário filtra a listagem para exibir apenas pessoas falecidas
- **THEN** o sistema retorna somente pessoas com `falecido` igual a verdadeiro

#### Scenario: Filtro por faixa de data de nascimento
- **WHEN** o usuário informa uma data inicial e uma data final para filtrar por data de nascimento
- **THEN** o sistema retorna apenas pessoas cuja data de nascimento esteja dentro do intervalo informado, inclusive nos extremos

#### Scenario: Filtros combinados
- **WHEN** o usuário aplica simultaneamente busca textual, tipo de vínculo e situação vital
- **THEN** o sistema retorna apenas as pessoas que satisfazem todos os filtros aplicados ao mesmo tempo

#### Scenario: Ordenação por coluna
- **WHEN** o usuário clica no cabeçalho da coluna de nome, CPF ou status na listagem
- **THEN** o sistema reordena as linhas exibidas de acordo com a coluna e o sentido (ascendente/descendente) escolhidos

#### Scenario: Exportação das linhas filtradas
- **WHEN** o usuário aciona a exportação da listagem com filtros aplicados
- **THEN** o sistema gera o arquivo no formato escolhido (CSV, XLSX ou PDF) contendo apenas as linhas que atendem aos filtros vigentes no momento da exportação

### Requirement: Área de rolagem única por modal
O sistema SHALL apresentar, em cada modal (diálogo) do módulo de Cadastro de Pessoas, no máximo uma área de rolagem vertical para o conteúdo, sem aninhar uma segunda área de rolagem dentro da área de rolagem padrão do componente de diálogo do design system.

#### Scenario: Modal de novo cadastro sem rolagem duplicada
- **WHEN** o conteúdo do assistente de novo cadastro de pessoa excede a altura visível do modal
- **THEN** o sistema exibe apenas uma barra de rolagem vertical, controlada pelo próprio diálogo, sem uma segunda área de rolagem aninhada dentro do conteúdo

#### Scenario: Modal de detalhe sem rolagem duplicada
- **WHEN** o conteúdo da ficha detalhada de uma pessoa excede a altura visível do modal
- **THEN** o sistema exibe apenas uma barra de rolagem vertical, controlada pelo próprio diálogo, sem uma segunda área de rolagem aninhada dentro do conteúdo

### Requirement: Modais ergonômicos e completos para o ciclo de vida da pessoa física
O sistema SHALL fornecer modais enriquecidos e ergonômicos construídos exclusivamente a partir dos primitivos do pacote `@sysgov/ui` para todo o ciclo de vida da pessoa: wizard de criação guiada (`NovaPessoaWizard`), modal de detalhe e gestão (`PessoaDetailView`), modal de promoção a usuário (`PromoverPessoaModal`) e modais de sub-entidades (documentos com emissão e UF, endereços com consulta integrada de CEP e contatos com canais e notificações), garantindo fluxo contínuo sem travamentos.

#### Scenario: Cadastro completo no Wizard com preenchimento de CEP
- **WHEN** o usuário informa um CEP válido durante a etapa de endereço do wizard de nova pessoa
- **THEN** o sistema busca e preenche automaticamente logradouro, bairro, cidade e UF, mantendo o foco pronto para o número predial

#### Scenario: Gestão de múltiplos documentos e contatos em modais dedicados
- **WHEN** o operador adiciona ou edita um documento civil no modal de sub-entidades
- **THEN** o sistema valida o tipo de documento, UF de emissão e órgão emissor em formulário tipado com feedback em tempo real

### Requirement: Prevenção de quebra de layout e tipografia técnica consistente
O sistema SHALL aplicar tipografia monoespaçada `JetBrains Mono` (`font-mono tabular-nums`) em todos os dados numéricos e identificadores (CPF, RG, NIS, CEP, datas, telefones e matrículas funcionais) e implementar regras rígidas de contenção de layout (`truncate`, `break-words`, `min-w-0` e tooltips informativos) em colunas de tabelas, cards e modais, prevenindo quebra indesejada de palavras ou estouro visual em qualquer resolução de tela.

#### Scenario: Exibição de nomes ou e-mails extensos sem distorção
- **WHEN** uma pessoa com nome civil longo ou endereço de e-mail corporativo extenso é exibida na tabela ou nos cards do modal
- **THEN** o sistema trunca graciosamente o texto mantendo o alinhamento dos botões e exibe o conteúdo integral ao passar o cursor (tooltip)

#### Scenario: Identificadores técnicos formatados em monoespaçamento
- **WHEN** datas de vigência, CPF, matrícula ou números de documentos são renderizados na interface
- **THEN** os caracteres utilizam `font-mono tabular-nums` assegurando legibilidade e alinhamento vertical perfeito

### Requirement: Promoção a usuário por ação explícita e auditada
O sistema SHALL promover uma pessoa a usuário apenas por ação explícita de um administrador com a permissão `cadastros.pessoas.promote`, nunca automaticamente a partir de cadastro ou importação. A ação de promover SHALL estar acessível tanto a partir do detalhe da pessoa quanto diretamente da listagem, para uma pessoa que ainda não possui usuário vinculado.

#### Scenario: Promoção a usuário
- **WHEN** um administrador promove uma pessoa existente a usuário
- **THEN** o sistema cria a conta de acesso vinculada à pessoa por CPF, registra a ação em audit_logs e não cria uma segunda pessoa

#### Scenario: Promoção sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta promover uma pessoa a usuário
- **THEN** o sistema rejeita a ação com erro de autorização e nenhuma conta é criada

#### Scenario: Pessoa já promovida
- **WHEN** um administrador tenta promover a usuário uma pessoa que já possui conta de acesso vinculada
- **THEN** o sistema rejeita a ação informando que a pessoa já possui usuário

#### Scenario: Promoção acessível pela listagem
- **WHEN** um administrador com a permissão de promover visualiza a listagem de pessoas
- **THEN** o sistema oferece a ação de promover diretamente em cada linha cuja pessoa ainda não possui usuário vinculado, sem exigir abrir o detalhe da pessoa

### Requirement: Importação de pessoa com deduplicação por CPF
O sistema SHALL importar pessoas de sistemas de gestão da prefeitura de forma assíncrona, buscando por CPF no tenant: se a pessoa já existir, o sistema SHALL atualizar/vincular o registro existente; se não existir, o sistema SHALL criar um novo registro. A importação SHALL NOT promover a pessoa a usuário.

#### Scenario: Importação com deduplicação
- **WHEN** uma pessoa chega da integração com CPF já existente no tenant
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar duplicado

#### Scenario: Importação de pessoa nova
- **WHEN** uma pessoa chega da integração com CPF não cadastrado no tenant
- **THEN** o sistema cria um novo registro de pessoa sem conta de acesso associada

### Requirement: Integração externa resiliente
O sistema SHALL isolar cada integração com sistema de gestão da prefeitura em um adapter próprio, consumido de forma assíncrona (fila), com timeout e fallback, de modo que uma integração externa indisponível ou lenta SHALL NOT impedir o uso do cadastro de pessoas nem de qualquer outra funcionalidade do sistema. A configuração de cada integração (URL, credenciais, mapeamento de campos) SHALL ser gerenciável por um administrador do tenant, e o token de acesso ao sistema externo SHALL ser armazenado cifrado, nunca em texto plano.

#### Scenario: Sistema externo indisponível
- **WHEN** o sistema de gestão da prefeitura está indisponível durante uma tentativa de importação
- **THEN** o sistema registra a falha para nova tentativa posterior e continua respondendo normalmente às demais operações do cadastro de pessoas

#### Scenario: Token de integração nunca exposto em texto plano
- **WHEN** um administrador consulta os dados de uma integração cadastrada
- **THEN** o sistema retorna o token mascarado ou omitido, nunca o valor em texto plano armazenado

### Requirement: Gestão de integrações com sistemas de gestão da prefeitura
O sistema SHALL permitir que um administrador do tenant, com a permissão específica de gestão de integrações, cadastre, edite e ative/desative uma conexão com um sistema de gestão da prefeitura (nome, URL, token de API, mapeamento de campos), sem depender de acesso direto ao banco de dados.

#### Scenario: Cadastro de nova integração
- **WHEN** um administrador cadastra uma nova integração com nome, URL e token válidos
- **THEN** o sistema salva a configuração para o tenant e ela fica disponível para uso pela importação de pessoas

#### Scenario: Desativação de integração
- **WHEN** um administrador desativa uma integração ativa
- **THEN** o sistema deixa de aceitar novas importações através dela, sem afetar o histórico de sincronizações já realizado

#### Scenario: Gestão de integrações sem permissão
- **WHEN** um usuário sem a permissão de gestão de integrações tenta cadastrar ou editar uma integração
- **THEN** o sistema rejeita a ação com erro de autorização

### Requirement: Histórico de sincronização consultável
O sistema SHALL permitir consultar o histórico de tentativas de sincronização de pessoas (sucesso, falha ou não encontrado) por tenant e por integração, incluindo os detalhes do erro quando houver falha.

#### Scenario: Consulta do histórico de sincronização
- **WHEN** um administrador consulta o histórico de uma integração
- **THEN** o sistema retorna as tentativas de sincronização daquele tenant, com status, contadores e detalhes de cada uma

#### Scenario: Filtro por status de sincronização
- **WHEN** um administrador filtra o histórico apenas por tentativas com falha
- **THEN** o sistema retorna somente as tentativas cujo status é de falha

### Requirement: Reprocessamento manual de sincronização com falha
O sistema SHALL permitir que um administrador reprocesse manualmente uma tentativa de sincronização que falhou, disparando novamente a mesma importação (mesmo CPF, mesma integração) pelo fluxo assíncrono, sem criar um registro de pessoa duplicado.

#### Scenario: Reprocessamento de falha
- **WHEN** um administrador aciona o reprocessamento de um registro de histórico com status de falha
- **THEN** o sistema agenda uma nova tentativa de sincronização para o mesmo CPF e integração, registrando uma nova entrada no histórico

#### Scenario: Reprocessamento não duplica pessoa já existente
- **WHEN** o reprocessamento de uma falha encontra uma pessoa que já foi criada por uma tentativa concorrente
- **THEN** o sistema atualiza/vincula o registro existente em vez de criar uma pessoa duplicada

### Requirement: Controle de acesso por permissão específica
O sistema SHALL exigir, no backend, a permissão específica correspondente para cada ação sobre o cadastro de pessoas (`cadastros.pessoas.view` para consulta, `cadastros.pessoas.create` para criação, `cadastros.pessoas.update` para edição, `cadastros.pessoas.delete` para exclusão), independentemente do que a interface exibir.

#### Scenario: Edição sem permissão
- **WHEN** um usuário sem a permissão `cadastros.pessoas.update` tenta editar uma pessoa
- **THEN** o sistema rejeita a ação com erro de autorização, mesmo que a requisição chegue direto à API sem passar pela interface

### Requirement: Isolamento por tenant
O sistema SHALL isolar todos os dados do cadastro de pessoas por tenant, com a unicidade do CPF aplicada apenas dentro do mesmo tenant.

#### Scenario: Isolamento por tenant
- **WHEN** duas prefeituras cadastram a mesma pessoa física
- **THEN** cada tenant mantém seu registro independente sem conflito de unicidade

### Requirement: Validação de ações de escrita via Form Requests dedicados
O sistema SHALL validar todas as ações de escrita do módulo por Form Requests dedicados, aplicando a validação algorítmica de dígitos verificadores de CPF, unicidade por tenant (composto por tenant_id e cpf_hash, desconsiderando o próprio registro no caso de atualização), vigência cronológica válida de vínculos (data de início menor ou igual à data de término) e conformidade de formatos para e-mail, telefone e CEP.

#### Scenario: CPF inválido rejeitado
- **WHEN** uma pessoa é cadastrada com CPF cujos dígitos verificadores são matematicamente inválidos
- **THEN** o sistema rejeita a operação com erro de validação HTTP 422 e nenhum registro de pessoa é criado no banco de dados

#### Scenario: Atualização com mesmo CPF do próprio registro
- **WHEN** os dados de uma pessoa são atualizados mantendo o mesmo CPF já cadastrado para ela
- **THEN** o sistema aceita a requisição sem acusar conflito de unicidade de CPF no tenant

#### Scenario: Vigência cronológica de vínculo inconsistente
- **WHEN** um vínculo é cadastrado informando data de término anterior à data de início
- **THEN** o sistema rejeita a requisição com erro de validação e não cria o vínculo

### Requirement: Serialização estrita via API Resources sem exposição de dados sensíveis
O sistema SHALL serializar todas as respostas da API contendo pessoas, vínculos, documentos, endereços e contatos por meio de API Resources dedicados, garantindo a proteção da privacidade e conformidade com a LGPD. Para usuários padrão e consultas gerais, o sistema SHALL retornar exclusivamente o `cpf_mascarado`, nunca expondo `cpf` ou `cpf_hash` em texto puro. Para usuários com perfil de administrador ou permissão explícita `cadastros.pessoas.view_sensitive`, o sistema SHALL admitir a visualização dos dados civis completos sob demanda (`cpf_desmascarado`), registrando auditoria de acesso.

#### Scenario: CPF nunca serializado
- **WHEN** a API retorna o detalhe ou a listagem de pessoas para requisições comuns sem privilégios administrativos
- **THEN** a resposta JSON contém apenas o campo `cpf_mascarado` (com formato mascarado), sem os campos `cpf` em texto puro ou `cpf_hash`

#### Scenario: Desmascaramento autorizado para administradores
- **WHEN** um usuário com permissão `cadastros.pessoas.view_sensitive` ou perfil de administrador solicita a visualização completa do registro de uma pessoa
- **THEN** a API disponibiliza os campos civis completos e registra no `audit_logs` a visualização do dado sensível

#### Scenario: Serialização consistente de sub-entidades
- **WHEN** a API retorna documentos, endereços ou contatos vinculados a uma pessoa
- **THEN** a resposta é formatada pelos respectivos API Resources garantindo tipos padronizados e omissão de chaves internas desnecessárias

### Requirement: Visualização completa e desmascaramento sob demanda de dados sensíveis para administradores
O sistema SHALL prover na interface do módulo de pessoas e em seus modais a capacidade de visualizar dados completos (como CPF, filiação e documentos completos) exclusivamente para perfis de administrador ou usuários autorizados, mantendo o mascaramento visual ativo por padrão com botão de revelação/cópia rápida protegido por autorização e auditoria.

#### Scenario: Revelação de CPF restrita a administradores
- **WHEN** um administrador clica para revelar o CPF completo no modal de detalhe da pessoa
- **THEN** o sistema exibe o documento formatado em `JetBrains Mono` com botão de cópia rápida e emite registro de auditoria

#### Scenario: Bloqueio de visualização sensível para operadores comuns
- **WHEN** um usuário comum abre o modal de detalhe ou consulta uma pessoa
- **THEN** o CPF permanece estritamente mascarado (ex: `***.456.789-**`) e o botão de revelação fica indisponível

### Requirement: Autorização granular e integridade de recurso via PessoaPolicy
O sistema SHALL autorizar cada operação do módulo por meio da `PessoaPolicy`, combinando a checagem das permissões de RBAC (`cadastros.pessoas.view`, `cadastros.pessoas.create`, `cadastros.pessoas.update`, `cadastros.pessoas.delete`, `cadastros.pessoas.promote`, `cadastros.pessoas.import`) com regras de integridade do recurso, impedindo a exclusão de qualquer pessoa que possua vínculos ativos vigentes.

#### Scenario: Exclusão com vínculos ativos
- **WHEN** um usuário com permissão de exclusão tenta excluir uma pessoa que possui um ou mais vínculos com vigência ativa
- **THEN** o sistema nega a exclusão física e orienta o encerramento prévio dos vínculos ativos ou a aplicação de soft delete controlado

#### Scenario: Promoção restrita a usuários autorizados
- **WHEN** um usuário sem a permissão `cadastros.pessoas.promote` tenta acionar o endpoint de promoção a usuário
- **THEN** a `PessoaPolicy` nega a operação retornando código HTTP 403

### Requirement: CRUD completo de sub-entidades com unicidade de contato principal
O sistema SHALL permitir criar, atualizar e excluir individualmente documentos, endereços e contatos associados a uma pessoa por rotas RESTful dedicadas, garantindo atomicidade transacional para a regra de contato principal único por tipo (`celular`, `email`, `telefone`). Ao excluir ou desmarcar o contato principal, o sistema SHALL promover automaticamente outro contato do mesmo tipo a principal ou liberar a sinalização se não houver remanescente.

#### Scenario: Contato principal exclusivo por tipo
- **WHEN** um contato marcado como principal é excluído e existe outro contato cadastrado do mesmo tipo para a pessoa
- **THEN** o sistema promove automaticamente outro contato do mesmo tipo a principal na mesma transação atômica

#### Scenario: Exclusão do único contato do tipo
- **WHEN** o único contato de determinado tipo é excluído
- **THEN** o sistema conclui a remoção e libera a flag sem inconsistências para o tipo correspondente

#### Scenario: Atualização individual de documento
- **WHEN** uma requisição PUT é enviada para o identificador específico de um documento da pessoa
- **THEN** o sistema atualiza os atributos informados (número, órgão emissor, UF, data) preservando o histórico de auditoria

### Requirement: Busca de pessoas por CPF com normalização de máscara
O sistema SHALL localizar pessoas por CPF independentemente da presença de máscara, pontos ou traços, sanitizando a entrada para 11 dígitos numéricos e consultando diretamente o `cpf_hash` calculado no escopo da requisição, mantendo a busca textual aproximada por nome quando a entrada não corresponder a um documento sanitizado.

#### Scenario: Busca com pontuação
- **WHEN** o usuário realiza uma busca informando um CPF formatado com pontuação (ex.: 000.000.000-00)
- **THEN** o sistema calcula o hash dos 11 dígitos no request e retorna com precisão a pessoa correspondente cadastrada no tenant

#### Scenario: Busca textual por nome
- **WHEN** o usuário realiza uma busca informando um texto alfabético
- **THEN** o sistema aplica filtro de aproximação sobre a coluna de nome da pessoa

### Requirement: Auditoria transacional sistemática de mutações
O sistema SHALL registrar na tabela `audit_logs`, por meio do `AuditLogger`, todas as operações de mutação do ciclo de vida de pessoas (criação, atualização, exclusão, adição e encerramento de vínculos, alteração e exclusão de sub-entidades, promoção a usuário e importações com ou sem deduplicação), registrando tenant_id, usuário executor, módulo, ação, identificador do recurso e estados anterior e posterior.

#### Scenario: Promoção auditada
- **WHEN** um administrador promove uma pessoa a usuário
- **THEN** a ação `pessoa.promovida` é registrada em `audit_logs` contendo o ID do usuário autor, o tenant e os dados resultantes do vínculo

#### Scenario: Exclusão de contato auditada com before e after
- **WHEN** um contato de uma pessoa é excluído
- **THEN** o registro de auditoria documenta o estado anterior do contato removido e a eventual promoção do contato sucessor

### Requirement: Processamento de importação exclusivamente assíncrono
O sistema SHALL processar todas as solicitações de importação de pessoas de sistemas externos exclusivamente por meio de eventos da tabela `outbox_events` e execução em fila em segundo plano com política de retry e backoff exponencial, assegurando resposta HTTP imediata (202 Accepted) e acompanhamento detalhado via registros de `PessoaSyncLog`.

#### Scenario: Request não bloqueia na integração
- **WHEN** uma importação de pessoa por documento é solicitada via API
- **THEN** a resposta HTTP 202 é retornada imediatamente informando o agendamento, enquanto o processamento ocorre via worker assíncrono com status observável em `sync-logs`

#### Scenario: Falha de comunicação externa registrada em sync log
- **WHEN** o worker tenta sincronizar os dados e o serviço externo falha ou excede o timeout
- **THEN** o sistema registra o log de falha com detalhes em `PessoaSyncLog` e aplica o retry programado sem travar a thread de atendimento

### Requirement: Cobertura abrangente de testes de feature e isolamento
O sistema SHALL possuir suíte automatizada de testes de feature e integração que valide rigorosamente a unicidade de CPF por tenant, o isolamento multi-tenant impedindo vazamento de dados entre prefeituras, os fluxos de promoção a usuário (sucesso, tentativa sem permissão e tentativa sobre pessoa já promovida), a concorrência na eleição de contato principal, a exportação em formatos JSON e CSV, e a execução assíncrona do pipeline de importação.

#### Scenario: Validação de isolamento e unicidade entre tenants
- **WHEN** dois tenants distintos cadastram pessoas com o mesmo CPF
- **THEN** ambos os cadastros são aceitos com sucesso e nenhum tenant tem visibilidade sobre os registros do outro

#### Scenario: Garantia de exportação íntegra
- **WHEN** o endpoint de exportação é acionado com formato CSV ou JSON
- **THEN** o arquivo gerado contém os dados dos munícipes e servidores do tenant solicitante respeitando o mascaramento de documentos

### Requirement: Consumo de dados mestres (MDM) por módulos satélites
O sistema SHALL disponibilizar suporte para que outros módulos do ecossistema SYSGOV referenciem registros de pessoas por meio da chave estrangeira nula `pessoa_id` com índice composto `[tenant_id, pessoa_id]`, oferecendo contrato e utilitários no SDK TypeScript para consulta e resolução de pessoas por documento sem duplicar atributos civis nas tabelas de domínio satélite.

#### Scenario: Vínculo de operador com pessoa
- **WHEN** um operador de cemitério é cadastrado associando o identificador de uma pessoa física previamente registrada
- **THEN** o registro do operador referencia a pessoa correspondente do cadastro único, mantendo os dados civis centralizados e sem redundância

### Requirement: Hub central de dados mestres de pessoas para consumo compartilhado entre módulos
O sistema SHALL disponibilizar no `@sysgov/ui` e no `web-client` componentes e hooks universais de integração de pessoas (`PessoaPicker`, `usePessoaPicker`, `PessoaCard`, `PessoaBadge`), permitindo que qualquer módulo satélite (Requerimentos, Cemitérios, RH, Protocolo, Financeiro, CAPD, Cursos) realize busca rápida por nome/CPF com debounce, seleção fluida e cadastro rápido inline sem descontinuar a tarefa do operador.

#### Scenario: Seleção rápida e cadastro inline a partir de outro módulo
- **WHEN** um operador está em um formulário de outro módulo (ex.: Requerimento ou Concessão de Cemitério) e a pessoa ainda não existe
- **THEN** o componente permite abrir o modal de cadastro rápido de pessoa, salvar o registro e já selecioná-lo automaticamente no formulário de origem

### Requirement: Registro e Manutenção de Situação Vital (Óbito)
O sistema SHALL permitir o registro e manutenção formal da situação vital da pessoa física no cadastro mestre (MDM), armazenando os campos `falecido` (booleano), `data_falecimento` (data), `certidao_obito_numero` (string opcional), `cartorio_obito` (string opcional) e `observacao_obito` (texto opcional).

#### Scenario: Atualizar pessoa para situação de falecida com sucesso
- **WHEN** um operador com permissão `cadastros.pessoas.update` envia os dados civis marcando `falecido: true`, informando uma data de falecimento válida e dados opcionais da certidão de óbito
- **THEN** o sistema SHALL persistir a situação vital, atualizar o status civil da pessoa para refletir o falecimento, registrar a alteração no `audit_logs` e retornar os dados atualizados com o indicador vital ativo.

#### Scenario: Validação de consistência cronológica do falecimento
- **WHEN** um operador tentar salvar uma pessoa marcando `falecido: true` com uma `data_falecimento` anterior à `data_nascimento` ou no futuro
- **THEN** o sistema SHALL rejeitar a requisição com código HTTP 422 Unprocessable Entity e mensagem de validação orientando a inconsistência temporal.

### Requirement: Exibição Visual da Situação Vital no MDM e Componentes Compartilhados
O sistema SHALL exibir identificação visual imediata de falecimento (badge destacado "Falecido(a)") em todas as listagens de pessoas, na Ficha Cadastral detalhada (`PessoaDetailView`), no card resumido (`PessoaCard`) e no seletor de pessoas (`PessoaPicker`), incluindo a data de óbito formatada em tipografia monoespaçada quando disponível.

#### Scenario: Visualização de munícipe falecido no seletor e na listagem
- **WHEN** um usuário consulta munícipes na listagem geral ou busca pessoas por meio do `PessoaPicker`
- **THEN** os munícipes com registro de falecimento SHALL apresentar uma badge visual distintiva de óbito e o ano ou data de falecimento, diferenciando-os claramente dos cidadãos ativos.

### Requirement: Sincronização Automática com Módulos Satélites de Cemitério
O sistema SHALL expor e permitir que módulos satélites, em especial o Módulo de Cemitérios, invoquem a atualização cadastral de situação vital quando um falecimento de titular ou inumação for registrado, atualizando atomicamente o registro de pessoa mestre correspondente (`pessoa_id`).

#### Scenario: Sincronização acionada por evento de falecimento em módulo satélite
- **WHEN** o módulo de Cemitérios registra formalmente o falecimento de um titular concessionário ou inumado vinculado a uma `Pessoa` existente
- **THEN** o sistema SHALL atualizar a `Pessoa` vinculada definindo `falecido: true` e a respectiva data de falecimento, mantendo a integridade cadastral sem exigir intervenção manual duplicada no MDM.

### Requirement: Regularização do documento de pessoa com documento pendente
O sistema SHALL permitir informar o CPF de uma pessoa com `documento_pendente`, mantendo o mesmo identificador, o histórico, os vínculos e as referências dos módulos. O sistema SHALL validar o CPF informado e rejeitar a regularização quando o CPF já pertencer a outra pessoa do tenant, oferecendo a opção de mesclar os dois cadastros.

#### Scenario: Regularização com CPF novo
- **WHEN** um usuário com permissão informa um CPF válido e ainda não usado para uma pessoa com documento pendente
- **THEN** o sistema grava o documento, remove o estado `documento_pendente` e mantém o identificador e todas as referências da pessoa

#### Scenario: Regularização com CPF de outra pessoa
- **WHEN** o CPF informado já pertence a outra pessoa do tenant
- **THEN** o sistema rejeita a regularização, informa a pessoa já cadastrada e oferece a mesclagem dos cadastros em vez de criar duplicidade

### Requirement: Responsável obrigatório para menor com documento pendente
O sistema SHALL exigir, para pessoa física menor de idade com `documento_pendente`, um responsável legal que seja pessoa física do mesmo tenant, sem duplicar os dados civis do responsável.

#### Scenario: Menor sem responsável
- **WHEN** uma pessoa menor de 18 anos é cadastrada sem CPF e sem responsável
- **THEN** o sistema rejeita o cadastro informando que o responsável é obrigatório

#### Scenario: Responsável de outro tenant ou jurídico
- **WHEN** o responsável informado pertence a outro tenant ou é pessoa jurídica
- **THEN** o sistema rejeita a requisição informando que o responsável deve ser pessoa física do mesmo tenant

### Requirement: Proteção de dados de pessoa sem documento e de menores
O sistema SHALL tratar pessoa com documento pendente e menores de idade como dados de acesso restrito: exibição sem dados sensíveis nas listagens e nos seletores compactos, acesso completo apenas por permissão específica e registro de auditoria nas leituras desmascaradas.

#### Scenario: Seletor compacto sem documento
- **WHEN** o seletor de pessoas lista uma pessoa com documento pendente
- **THEN** a resposta contém nome e o indicador de documento pendente, sem documento, data de nascimento ou filiação

### Requirement: Validação única de documento no cadastro central
O sistema SHALL validar CPF e CNPJ exclusivamente pelas regras do cadastro central de pessoas, e os módulos consumidores SHALL reutilizar essa validação em vez de manter regras próprias.

#### Scenario: Mesmo resultado em todos os módulos
- **WHEN** um documento é validado por qualquer módulo
- **THEN** o resultado (válido, inválido, tipo) é idêntico ao do cadastro central, incluindo CPF com máscara ou sem máscara
