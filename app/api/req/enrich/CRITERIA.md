# Enrich Client — AI Search Criteria

The `POST /api/req/enrich` route generates a factual, employer-branding-oriented description of a client company for use in the Behovsavklarer brief.

---

## Output format

Exactly **two paragraphs**, plain prose. No titles, headers, markdown formatting, or section labels of any kind — not "Selskapet:", not "IT-avdeling:", nothing.

**Paragraph 1 — The company**
Size, industry, market position, ownership structure, and any other relevant factual context about who they are.

**Paragraph 2 — As an employer**
What is publicly known about the work environment, professional culture, and how the company presents itself to tech candidates. Written as a natural, fact-based presentation — not a list. Highlights authentic positive aspects based on what the company actually communicates about itself (career pages, LinkedIn, press, annual reports).

---

## What is explicitly excluded

- **Tech stack and specific tools** — this belongs in other fields in the brief (arbeidsoppgaver, prosjektbeskrivelse). Do not mention frameworks, platforms, or specific technologies.
- **Assumptions about IT needs** — never write "de bruker trolig", "selskaper av denne typen trenger ofte", or any inference based on industry knowledge rather than documented fact.
- **Section headers or labels** before paragraphs — the output must read as flowing prose, not a structured report.
- **Speculation** — if information is not findable from credible public sources, omit it. A shorter, accurate description is always better than a longer one that guesses.

---

## Source criteria

Only confirmed public information is acceptable:
- Company website (about page, career page)
- Press releases and news articles
- LinkedIn company page
- Annual reports
- Industry databases (Proff, Brønnøysund, etc.)

**Not acceptable**: inference from industry norms, analogies to similar companies, or anything the model "knows" about a company that it cannot point to a specific public source for.

---

## Search query (Tavily)

```
"[selskap]" ansatte arbeidsmiljø kultur arbeidsgiver Norge
```

Targets company size, work culture, and employer branding content from Norwegian public sources.

---

## AI pipeline

1. **Tavily search** → raw snippets passed to Claude for synthesis using the system prompt
2. **Claude web_search tool** (if Tavily unavailable) → same system prompt applied
3. **Claude knowledge fallback** (if no search available) → explicitly told to only share confirmed knowledge, not speculate

All three paths use the same system prompt, so output quality and rules are consistent regardless of which data source responds.

---

## Tone and intent

The employer branding paragraph should read as though a well-informed recruiter is warmly but honestly presenting the company to a tech candidate who is weighing up whether to apply. It should:

- Be based on what the company actually says about itself
- Highlight genuine, specific positives (named initiatives, community programs, stated values) rather than generic praise
- Avoid marketing language or superlatives unless the company itself uses them
- Read naturally — not as a list, not as a formal report

**Good example (Fremtind):**
> Fremtind er Norges største skadeforsikringsselskap med mellom 1 000 og 5 000 ansatte, dannet gjennom fusjonen mellom forsikringsselskapene til SpareBank 1 og DNB i 2019 og senere merger med Eika Forsikring, noe som gir selskapet en markedsandel på rundt 20 prosent i det norske privatforsikringsmarkedet.
>
> Fagmiljøet er kjent for tverrfaglig samarbeid og aktive interne nettverk — blant annet et ODA-nettverk som løfter frem kvinner i teknologi og et eget designsystem-team (Jøkul). På LinkedIn og egne karrieresider kommuniserer Fremtind om faglig utvikling, kollegialt samhold og gode kompensasjonspakker som sentrale deler av arbeidsgiversiden, og ansattstories understreker en kultur der trivsel og kompetanseheving prioriteres.
