# Tasks

## 1. Backend: Exposição e Persistência do Relacionamento Concessionário-Pessoa

- [x] 1.1 Atualizar `Concessionario.php` e recursos da API de cemitérios para expor o relacionamento `pessoa` e a chave `pessoa_id` com documento mascarado
- [x] 1.2 Atualizar `ConcessaoController.php` e `ConcessionarioController.php` para aceitar `pessoa_id` nos payloads de criação e atualização de concessionários
- [x] 1.3 Executar e validar testes de backend em `Modules/Cemiterios/Tests` cobrindo a persistência do `pessoa_id` e resposta das rotas

## 2. Frontend: Visualização da Ficha Central de Pessoas na Aba Concessão e Titulares

- [x] 2.1 Importar e integrar o `PessoaDetailView` no `ModalDetalheJazigo.tsx` com estado para abrir a ficha cadastral do titular selecionado
- [x] 2.2 Adicionar botão de ação "Ver Cadastro Central (MDM)" e links interativos no nome e no badge do titular na aba Concessão & Titulares
- [x] 2.3 Disponibilizar alerta e ação de vinculação cadastral quando o concessionário for legado (sem `pessoa_id` associado)

## 3. Frontend: Edição de Titular Integrada com PessoaPicker e Cadastro Rápido

- [x] 3.1 Integrar o componente `PessoaPicker` de `@sysgov/ui` no modal "Editar Titular" de `ModalDetalheJazigo.tsx`, com busca reativa por nome e CPF
- [x] 3.2 Implementar preenchimento automático reativo dos dados cadastrais (nome, documento, contatos e endereço completo via CEP) ao selecionar uma pessoa mestre
- [x] 3.3 Habilitar cadastro rápido inline através do `PessoaFormModal`, permitindo cadastrar uma nova pessoa física no módulo central sem fechar o modal do jazigo

## 4. Frontend: Outorga de Nova Concessão no Jazigo Vago

- [x] 4.1 Criar modal de outorga de concessão na aba Concessão & Titulares de `ModalDetalheJazigo.tsx` quando o túmulo não possuir concessão ativa
- [x] 4.2 Integrar a seleção obrigatória do concessionário titular através do `PessoaPicker`, definindo modalidade, termo, vigência e processo administrativo municipal
- [x] 4.3 Persistir a nova concessão na API e recarregar os dados do jazigo e das concessões associadas com feedback de sucesso

## 5. Frontend: Integração Consolidada em Todo o Módulo de Cemitérios

- [x] 5.1 Atualizar `ConcessoesView.tsx` assegurando que os formulários de concessão utilizem o seletor universal de pessoas
- [x] 5.2 Verificar e enriquecer `ModalNovaInumacao.tsx` e `HerdeirosTable.tsx` para suporte contínuo ao fluxo de cadastro rápido e busca com debounce
- [x] 5.3 Garantir tipografia técnica `JetBrains Mono` (`font-mono tabular-nums`) em todos os documentos, processos administrativos e datas

## 6. Verificação End-to-End e Qualidade

- [x] 6.1 Executar a suíte de testes de componentes do módulo de cemitérios: `npm test --workspace=@sysgov/web-client -- src/modules/cemiterios`
- [x] 6.2 Executar checagem de tipos TypeScript: `npm run typecheck --workspace=@sysgov/web-client`
- [x] 6.3 Validar a mudança com OpenSpec: `npx openspec validate cemiterios-integracao-pessoas-mdm`
