# ComponenteCurricular (i-Educar legado), Perguntas

> Perguntas em aberto que dependem de validação humana, derivadas das lacunas desta unit. Insumo da fase de revisão (`revisao`).
> Confiança: 🟢 CONFIRMADO no código, 🟡 INFERIDO, 🔴 LACUNA.

| # | Pergunta | Origem | Impacto | Dono | Prazo |
|---|----------|--------|---------|------|-------|
| Q-01 | O bypass da trava do iDiário na gravação da turma causou desvinculações com notas lançadas na base real? | `app/Http/Controllers/SchoolClassController.php:307-346` 🔴 | Alto — integridade dos diários | Dados | Antes da migração |
| Q-02 | A exclusão em massa de componentes da série foi usada em produção com lançamentos presentes? | `ComponentesSerieController.php:257-295` 🔴 | Alto — perda de matriz | Dados | Antes da migração |
| Q-03 | Quem na rede tem os processos 946, 945 e 580, e há operadores criando componentes sem nomes oficiais? | `EditController.php:9` e `educar_componente_curricular_lst.php:141-144` 🟡 | Médio — governança do currículo | Secretaria | Antes do piloto |
| Q-04 | A coluna `hora_falta` está preenchida na base real, e a sua ausência no contrato do bastão esconde um uso vivo? | `LegacyDisciplineAcademicYear.php:46-55` 🟡 | Médio — custo do cálculo de faltas | Dados | Antes da migração |
| Q-05 | Os códigos INEP do enumerador estão alinhados com a tabela vigente do Educacenso? | `CodigoEducacenso.php` 🟡 | Alto — conformidade do censo | Secretaria | Antes do censo |
| Q-06 | Há componentes com código INEP vazio que devem receber o código na migração? | `CodigoEducacenso.php:10` 🟡 | Alto — exportação do censo | Dados | Antes da migração |
| Q-07 | Os anos letivos da matriz divergem entre a matriz série, a habilitação escola e a turma na base real? | `AnoEscolarDataMapper.php:11-19` 🟡 | Médio — coerência por ano | Dados | Antes da migração |
| Q-08 | A soma da carga horária das matrizes ativas atinge as 800 horas da LDB nas séries da rede? | ausente no legado 🔴 | Alto — conformidade legal | Jurídico e Pedagogo | Antes do piloto |
| Q-09 | Componentes desconsiderados na progressão são usados além do ensino religioso (atividades e eletivas)? | `Componente.php:14` 🟡 | Médio — regra de reprovação | Pedagogo | Antes do piloto |
| Q-10 | A diferenciação por turma (parâmetro institucional) está ligada em quantas instituições, e por que motivo? | `educar_turma_cad.php:936-948` 🟡 | Médio — modelagem da execução | Secretaria | Antes da migração |
| Q-11 | Pares de componentes com nome e abreviação quase iguais devem ser unificados na migração? | `ComponenteDataMapper.php:104-111` 🟡 | Alto — duplicidade curricular | Dados | Antes da migração |
| Q-12 | O mapa `MigratedDiscipline` tem vínculos órfãos ou conflitos com a unificação executada? | `app/Models/MigratedDiscipline.php` 🟡 | Médio — história dos dados | Dados | Antes da migração |
| Q-13 | A habilitação escola e série carrega anos letivos divergentes da matriz, e qual é a fonte de verdade? | `escola_serie_disciplina` 🟡 | Alto — oferta das escolas | Dados | Antes da migração |
| Q-14 | Qual é o evento de negócio esperado para a homologação da matriz (publicação por ano, por série)? | ausente no legado 🔴 | Médio — ciclo de vida | Produto | Antes do piloto |
| Q-15 | A cor branca padrão dos componentes é aceitável para a rede, ou a migração deveria atribuir cores da paleta? | `Componente.php:15` 🟡 | Baixo — apresentação | Produto | Antes do piloto |
| Q-16 | Os vínculos turma com etapa específica têm as etapas utilizadas coerentes com o módulo da turma? | `SchoolClassController.php:321-331` 🟡 | Médio — execução no diário | Dados | Antes da migração |
| Q-17 | O docente vinculado no componente da turma tem uso real, ou a atribuição é feita outra via? | `TurmaDataMapper.php:26-28` 🟡 | Médio — modelagem do professor | Secretaria | Antes do piloto |
| Q-18 | A validação do nome de 5 a 200 caracteres pode recusar componentes reais registrados como sigla na base? | `Componente.php:60` 🟡 | Baixo — migração | Dados | Antes da migração |
| Q-19 | Há registros de turma com carga própria zero a preencher que hoje usam a matriz por omissão? | `SchoolClassController.php:314-316` 🟡 | Médio — carga correta | Dados | Antes da migração |
| Q-20 | A mensagem do bloqueio por turmas vinculadas na matriz da série deve citar as turmas ou o número delas? | `ComponentesSerieController.php:76-78` 🟡 | Baixo — mensagem ao operador | Produto | Antes do piloto |

> Total: 20 perguntas. Acumulado do plano: 247 perguntas em 13 units (227 de 12 units anteriores).
