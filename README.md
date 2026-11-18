# PetCare ERP

React 19 + TypeScript + [Mantine 9](https://mantine.dev) front end for the PetCare backend. Navigation,
data grids and edit forms are driven by backend menus and blueprints.

```bash
cp .env.example .env.local   # set BACKEND_URL
npm install
npm run dev                  # http://localhost:5173
npm run build                # type-check + production build
npm run lint                 # ESLint, including the layer rules below
```

## Architecture

The code is split into four layers. Dependencies only point inwards, and ESLint
(`no-restricted-imports` in `eslint.config.js`) enforces it.

```
src/
  domain/          Entities and business rules. Pure TypeScript: no React, fetch or Mantine.
    auth/            User, claims → user, registration rules
    catalog/         Product, Pet, Order, Account, Settings, sales report
    cart/            Cart line operations
    dashboard/       KPI / trend calculations
    menu/            Backend menu model, url → screen matching
    blueprint/       Data-table + edit-form blueprint rules, visibilityCriteria parser
  application/     Use cases and ports (interfaces) the outside world must implement.
    ports.ts         AuthGateway, MenuRepository, BlueprintRepository, ProductRepository, …
    services/        AuthService (login, register, restore session)
    services.ts      The Services container type the UI receives
  infrastructure/  Port implementations: HTTP client, repositories, localStorage, JWT decoding.
  presentation/    React + Mantine UI. Reaches infrastructure only through useServices().
    providers/       Services (DI), Auth, Menu, Cart contexts
    layouts/         AdminLayout (AppShell + sidebar), StoreLayout (storefront), AuthLayout
    pages/           auth/, admin/, customer/, MenuPage + screenRegistry
    blueprint/       BlueprintScreen (grid/cards) and RecordFormModal
    components/      Shared UI pieces
    theme/           Mantine theme (brand blue, store orange, navy)
  app/             Composition root: container.ts wires implementations to ports; App.tsx mounts providers and routes.
```

| Layer | May import |
| --- | --- |
| `domain` | nothing outside `domain` |
| `application` | `domain` |
| `infrastructure` | `domain`, `application` |
| `presentation` | `domain`, `application` (never `infrastructure` or `app`) |
| `app` | everything |

### Adding a screen

1. Add its key and match words to `domain/menu/screens.ts`.
2. Create the page under `presentation/pages/` and register it in `presentation/pages/screenRegistry.ts`.
3. If it needs new data, add a port to `application/ports.ts`, implement it in `infrastructure/repositories/`,
   and wire it in `app/container.ts`.

Menu items with a `dataTableBluePrintUrl` don't need any of this: `BlueprintScreen` renders them from the blueprint.

### Edit-form blueprints

The supported `fieldType`s are `textBox`, `textArea`, `dropDown`, `cascadeDropDown`, `radioButton` (`values: [{ radioValue }]`)
and `fileUpload`.
- **`visibilityCriteria`** (e.g. `field.type == 'Cat' && field.productType == 'Food'`) picks which entry of a repeated field is
  shown. It is evaluated by a small safe parser, not `eval`.
- **`valuesDependOnField`** clears a field when the fields it depends on change.
