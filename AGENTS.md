# AGENTS Richtlijnen

## 1. Code Stijl

- **Python**: Gebruik [Black](https://github.com/psf/black). Houd rekening met PEP 8.
- **JavaScript/React**: Gebruik [Prettier](https://prettier.io/). Volg de Airbnb Style Guide.

## 2. Testprocedures

- **Python**: Gebruik [pytest](https://pytest.org).
- **React**: Gebruik [Jest](https://jestjs.io/) en [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- Alle wijzigingen moeten bestaande tests doorstaan.

## 3. Commit Richtlijnen

Gebruik [Conventional Commits](https://www.conventionalcommits.org/) (bijv. `feat: Add new customer endpoint`).
- Korte titel (max. 50 karakters), optioneel een gedetailleerde body.

## 4. Pull Request Instructies

- **Titels**: Volg Conventional Commits.
- **Beschrijving**:
  - Korte samenvatting van de wijzigingen.
  - Lijst met belangrijke aanpassingen.
  - `Testing Done` sectie waarin je beschrijft hoe je hebt getest.

## 5. Beveiliging

Nooit API-sleutels of geheime data hardcoden. Gebruik omgevingsvariabelen (bijv. `.env`).

## 6. Multi-tenant Architectuur

Houd rekening met de multi-tenant backend:
- Zorg voor dataseparatie per bedrijf.
- Pas bestaande structuren en patterns aan zonder de datapartitie te doorbreken.

## 7. Bestandsstructuur

Respecteer de bestaande mappenstructuur:
- **final-crm-backend** (Flask): Volg Flask blueprints en modelstructuren.
- **final-crm-frontend** (React): Gebruik consistente componenten, hooks en mapindeling.