# Spec Delta

## Purpose

Estabelece as garantias transversais do módulo de cemitérios: isolamento por município, perfis e controle de
acesso, tratamento LGPD, sigilo da causa da morte, auditoria append-only e metas de desempenho e disponibilidade.

## ADDED Requirements

### Requirement: Isolamento por município
<!-- rastreabilidade: requisito de plataforma multi-tenant -->
Todos os dados do módulo SHALL pertencer a um único tenant, e nenhuma operação autenticada SHALL ler, alterar ou
referenciar dado de outro tenant; tentativas SHALL responder como recurso inexistente (404).

#### Scenario: Acesso cruzado
- **WHEN** um usuário do tenant A requisita pelo identificador um jazigo do tenant B
- **THEN** o sistema responde 404

### Requirement: Perfis padrão do módulo
<!-- rastreabilidade: DRS §4; RNF-10 -->
Ao habilitar o módulo para um tenant, o sistema SHALL criar os perfis Administrador Geral, Operador
Administrativo, Fiscal de Campo, Coveiro/Operacional e Financeiro, com as permissões correspondentes aos
privilégios do DRS, editáveis pelo administrador do tenant na gestão de perfis do painel do cliente.
Concessionário (autenticado pelo Gov.br) e Público em Geral (sem autenticação) SHALL NOT ser usuários do painel.

#### Scenario: Coveiro só vê ordens de serviço
- **WHEN** um usuário com perfil Coveiro/Operacional tenta cadastrar uma concessão
- **THEN** o sistema responde 403, mas permite consultar e confirmar a execução das ordens de serviço

#### Scenario: Perfil ajustado pelo tenant
- **WHEN** o administrador do tenant remove uma permissão do perfil Operador Administrativo
- **THEN** usuários desse perfil perdem o acesso correspondente naquele tenant apenas

### Requirement: Controle de acesso por papel
<!-- rastreabilidade: RNF-10 -->
Toda ação do módulo SHALL ser autorizada no servidor por permissão e, para recursos específicos, por política
aplicada ao objeto. Ocultar elementos na interface SHALL NOT ser tratado como controle de acesso.

#### Scenario: Chamada direta sem permissão
- **WHEN** um usuário sem permissão de exumação chama diretamente a API de exumação
- **THEN** o sistema responde 403

### Requirement: Sigilo da causa da morte e documentos médicos
<!-- rastreabilidade: RN-06; RNF-09; ADR-004 -->
Causa da morte e documentos médicos SHALL ser armazenados criptografados em repouso e SHALL ser visíveis somente
para usuários com permissão restrita específica (por padrão, apenas o perfil Administrador Geral); para os
demais, o campo SHALL ser omitido das respostas. Toda leitura desses dados SHALL ser registrada em auditoria.

#### Scenario: Usuário sem permissão restrita
- **WHEN** um operador sem permissão restrita consulta um falecido
- **THEN** a resposta não contém causa da morte nem documentos médicos

#### Scenario: Leitura auditada
- **WHEN** um usuário com permissão restrita visualiza a causa da morte
- **THEN** um registro de auditoria de leitura é criado com usuário, data e falecido

### Requirement: Proteção LGPD dos concessionários
<!-- rastreabilidade: RN-05; RNF-09; ADR-004 -->
Dados pessoais de concessionários e empreiteiros pessoa física SHALL ser tratados com base legal registrada,
criptografia em repouso para documento e contatos, exibição mascarada do CPF em listagens, e SHALL permitir ao
titular consultar e solicitar correção de seus dados pelo portal. Dados pessoais SHALL NOT ser enviados a
serviços externos além do mínimo necessário à finalidade.

#### Scenario: CPF mascarado na listagem
- **WHEN** um atendente lista concessionários
- **THEN** o CPF aparece mascarado (ex.: ***.456.789-**)

### Requirement: Auditoria append-only
<!-- rastreabilidade: RNF-08 -->
Toda mutação do módulo SHALL gerar registro de auditoria com tenant, usuário, ação, recurso, valores anterior e
posterior, IP, agente e data/hora, encadeado ao registro anterior por hash. Registros de auditoria SHALL NOT ser
alterados ou excluídos por nenhuma funcionalidade. Registros de negócio SHALL usar exclusão lógica.

#### Scenario: Integridade da cadeia
- **WHEN** um registro de auditoria é adulterado diretamente no banco
- **THEN** a verificação de cadeia de auditoria acusa a quebra no registro adulterado

### Requirement: Metas de desempenho e disponibilidade
<!-- rastreabilidade: RNF-01, RNF-02, RNF-03, RNF-04, RNF-07 -->
O módulo SHALL atender: p95 abaixo de 250 ms para transações não espaciais; consultas geoespaciais abaixo de 1 s;
500 usuários simultâneos sem degradar essas metas; disponibilidade de 99,5% em horário comercial. Tabela de
preços e geometrias SHALL ser servidas de cache com invalidação na alteração.

#### Scenario: Preço alterado invalida cache
- **WHEN** uma nova vigência de preço é criada
- **THEN** a próxima consulta à tabela de preços retorna o novo valor
