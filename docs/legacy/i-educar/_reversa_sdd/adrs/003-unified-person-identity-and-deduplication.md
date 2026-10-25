# ADR-003: Unificação e Deduplicação Canônica de Pessoa Física e Perfis

> **Status:** 🟢 Aprovado / Decisão Arquitetural Consolidada  
> **Data:** 2026-10-12  
> **Autor:** Reversa Detective (`reversa-detective`) & Architect (`reversa-architect`)  
> **Contexto:** Plataforma SYSGOV — Modernização do i-Educar (`SYS-Educa`)

---

## 1. Contexto e Problema

No software legado i-Educar, uma mesma pessoa física no mundo real (ex.: um professor que também é pai de um aluno, ou um aluno que posteriormente é contratado como estagiário/servidor municipal) sofria com:
- Duplicação massiva de cadastros entre `cadastro.fisica`, `cadastro.pessoa`, `pmieducar.aluno`, `pmieducar.servidor` e `portal.funcionario`;
- Inconsistência de CPF, RG, filiação e contatos;
- Dificuldade para unificar históricos e conceder acessos ao portal;
- Ausência de mecanismo formal de fusão de duplicatas geradas por erros de digitação nas secretarias escolares.

---

## 2. Decisão Arquitetural

Adotou-se o padrão de **Entidade Única de Identidade Civil (`people`) com Especialização por Perfis/Papéis (`students`, `employees`, `users`, `guardians`) e Motor Transacional de Unificação (`PersonUnificationService`)**:

1. **Tabela Mestre `people`:**
   - Centraliza nome completo, nome social, data de nascimento, sexo/gênero, CPF único por tenant (ou NULL com justificativa regulamentada conforme commit `8e1f42a18`), filiação (mãe, pai, responsável legal) e certidão de nascimento civil / termo de matrícula.
2. **Especializações por Vínculo (1:1 ou 1:N):**
   - `students`: Detém atributos exclusivos do aluno (código INEP, necessidades educacionais especiais, NIS/Bolsa Família, autorizações de imagem/saída).
   - `employees`: Detém atributos do servidor escolar (matrícula funcional, escolaridade, formação superior, cargo efetivo/temporário, regime de trabalho).
   - `users`: Detém credenciais de login, e-mail de acesso, hash de senha e perfil RBAC no sistema.
3. **Serviço Transacional de Unificação (`PersonUnificationService`):**
   - Permite que a Secretaria de Educação selecione dois cadastros duplicados (origem e destino), validando similaridade fonética e de documentos.
   - O processo migra automaticamente todas as chaves estrangeiras vinculadas (matrículas, histórico, lançamentos de notas, diários, vínculos de parentesco) em uma transação atômica MySQL (`DB::transaction`).
   - O cadastro de origem tem seu status alterado para `UNIFIED` com ponteiro para o cadastro principal, mantendo trilha de auditoria completa em `person_unification_logs`.

---

## 3. Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens / Motivo de Rejeição |
| :--- | :--- | :--- |
| **Manter Aluno e Servidor como Tabelas Totalmente Desconectadas** | Simplicidade imediata na modelagem de telas isoladas. | Perpetuação da anarquia cadastral; dados de saúde, vacinação e contatos duplicados e desatualizados; violação de normas do e-Social e Censo Escolar. |
| **CPF Obrigatório Estrito para 100% dos Alunos** | Elimina duplicidades por chave única simples. | Inviável no ensino fundamental brasileiro e educação infantil, onde muitas crianças em vulnerabilidade social ainda não possuem CPF emitido no ato da primeira matrícula. Exigiu a criação do catálogo de motivos de ausência de documento (commit `8e1f42a18`). |
| **Identidade Canônica Única com Perfis Relacionados (Escolhida)** | Integridade referencial perfeita, histórico único da vida escolar do cidadão no município, conformidade com a LGPD e governança digital integrada ao SYSGOV. | Exige regras cuidadosas de unificação e garantia de índices para evitar locks prolongados. |

---

## 4. Consequências

### Positivas:
- Visão 360º do cidadão na rede municipal de ensino.
- Se o professor mudar de endereço ou telefone, a atualização reflete automaticamente em sua condição de pai/responsável do aluno na rede.
- Eliminação definitiva de cadastros fantasmas ou dispersos.

### Negativas / Riscos Mitigados:
- Operações de unificação de cadastro alteram dezenas de tabelas de histórico. *Mitigação:* Transação atômica em nível de isolamento `REPEATABLE READ`, lock pessimista das duas pessoas envolvidas e bloqueio de unificação caso existam matrículas ativas conflitantes no mesmo ano.
