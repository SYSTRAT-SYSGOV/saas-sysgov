# Revisão Cruzada: migração legada de necrópoles

> Identificador: `001-migracao-legado`
> Data: `2026-09-24`
> Artefato relacionado: `_reversa_sdd/04-geracao/requirements-migracao-legado.md`

## Itens por categoria

### Clareza

- [ ] Q-001 | Clareza | Cada frase do requirements tem sujeito, verbo e objeto explícitos
- [ ] Q-002 | Clareza | Não há frases iniciadas por "talvez", "provavelmente" ou "se possível" sem qualificação numérica
- [ ] Q-003 | Clareza | Termos do glossário do projeto são definidos na primeira ocorrência

### Completude

- [ ] Q-004 | Completude | Todas as seções obrigatórias do template estão preenchidas com conteúdo, não placeholders
- [ ] Q-005 | Completude | Cada Requisito Funcional tem critério de aceite verificável
- [ ] Q-006 | Completude | Existem cenários Gherkin para casos felizes E casos negativos

### Consistência

- [ ] Q-007 | Consistência | Termos chave do domínio aparecem com a mesma grafia em todas as seções
- [ ] Q-008 | Consistência | IDs citados em uma seção existem na seção que os define
- [ ] Q-009 | Consistência | Confidência (🟢 / 🟡 / 🔴) coerente com a fonte citada do `_reversa_sdd/`

### Cobertura

- [ ] Q-010 | Cobertura | Todo Requisito Funcional tem pelo menos um cenário Gherkin
- [ ] Q-011 | Cobertura | Toda Regra de Negócio nova ou alterada cita a regra original do `_reversa_sdd/domain.md` quando aplicável

### EdgeCases

- [ ] Q-012 | EdgeCases | Limites numéricos relevantes têm valor concreto (não "muitos", "poucos")
- [ ] Q-013 | EdgeCases | Estados vazios, nulos e iniciais foram considerados
- [ ] Q-014 | EdgeCases | Concorrência, retentativa e timeout foram considerados quando aplicáveis

### Jargão

- [ ] Q-015 | Jargão | Um humano novo no time entenderia o requirements sem glossário
- [ ] Q-016 | Jargão | Siglas são expandidas na primeira ocorrência

### SoluçãoImplícita

- [ ] Q-017 | SoluçãoImplícita | O requirements descreve o quê, não o como
- [ ] Q-018 | SoluçãoImplícita | Não há nome de biblioteca, framework ou produto comercial no documento

### Princípios

- [ ] Q-019 | Princípios | Cada Regra de Negócio respeita os princípios ativos em `.reversa/principles.md`
- [ ] Q-020 | Princípios | Conflitos com princípios estão registrados explicitamente, não escondidos

## Itens reprovados, detalhe

### Q-005

> motivo: Alguns RFs citam crítérios de aceite em texto livre sem métrica concreta.
> sugestão: Adicionar contagem esperada ou lista de campos verificados em cada critério.

### Q-012

> motivo: "Muitos" e "poucos" aparecem em justificativas de prioridade MoSCoW.
> sugestão: Substituir por contagens ou faixas numéricas.

### Q-014

> motivo: Concorrência e retentativa não foram abordadas no requirements.
> sugestão: Adicionar RNF ou cenário Gherkin para execução concorrente e retentativa de lote.

## Veredito

**Aprovado com ressalvas**

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-09-24 | Revisão cruzada gerada por `/reversa-reviewer` | reversa |