# Tasks

## 1. Vínculo do servidor com a pessoa (backend)

- [x] 1.1 Migration `capd_servidores.pessoa_id` (FK para `pessoas`, nullable até a conciliação) e relação `Servidor::pessoa()`. Verificar: suíte do CAPD e migrations em SQLite.
- [x] 1.2 `ServidorPessoaService`: CPF válido resolve/cria a pessoa sem sobrescrever o cadastro; sem CPF válido (ausente, malformado ou o `000.000.000-00` da integração) cria pessoa com documento pendente, sem exigir nascimento (servidor é adulto); matrícula e cargo viram `PessoaVinculo` funcional. Verificar: `ServidorPessoaTest`.
- [x] 1.3 Criação e edição de servidor (`ServidorService`) e importação CSV ligam a pessoa; edição de nome, nome social e nascimento grava na pessoa. Verificar: `ServidorPessoaTest` e `ServidorRegistryTest`.
- [x] 1.4 Sincronização de RH liga a pessoa por servidor, sem sobrescrevê-la, e falha de resolução não interrompe o lote. Verificar: `test_rh_sem_cpf_valido_cria_pessoa_pendente_e_nao_interrompe_o_lote`.
- [x] 1.5 Listener `PessoaAtualizada` mantém a cópia de exibição dos servidores ligados.

## 2. Conciliação dos servidores existentes

- [x] 2.1 Adaptador `ConciliacaoServidores` registrado no `ConciliacaoRegistry` (`pessoas:conciliar capd`), com `RegistroConciliacao::$exigirNascimento` para módulos de adultos. Verificar: dry-run não grava, reexecução idempotente, divergência sem sobrescrever e avaliações idênticas antes e depois (`test_conciliacao_vincula_servidores_existentes_sem_alterar_avaliacoes`).

## 3. Validação

- [x] 3.1 Suítes CAPD, Pessoas e Escola (415 testes) e PHPStan do projeto todo verdes.
- [ ] 3.2 Dry-run em produção (`pessoas:conciliar capd --dry-run`) depois do deploy; conferir os servidores com `000.000.000-00` (viram pessoa pendente).
- [ ] 3.3 Validação manual em homologação (cadastro de servidor, sincronização de RH, espelho de avaliação já selada).

## Fora desta fase
- E-mail e telefone do servidor permanecem no CAPD: no cadastro central ficam em contatos (tabela própria) e o login do servidor ainda se apoia no e-mail (`ServidorController`). Entram na Fase 5, com a remoção das colunas.
- Nenhuma tela do web-client muda: a API do servidor mantém o mesmo contrato.
