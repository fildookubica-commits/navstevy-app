# 🚀 MARS — Dochádzka & Sklad

> Single source of truth pre aplikáciu Mars. Tento dokument zhŕňa všetko podstatné na jednom mieste.

---

## 📋 Základ

| Pole | Hodnota |
|------|---------|
| **Názov** | Dochádzka Mars |
| **Typ** | Progressive Web App (PWA) — inštalovateľná na mobil/desktop |
| **Aktuálna verzia** | `FKAPP-MARS-023` |
| **Účel** | Dochádzka, plánovanie návštev predajní, sklad žuvačiek, KAD memo, druhotky |
| **Cieľová skupina** | Obchodní zástupcovia v teréne |
| **Jazyk UI** | Slovenčina |
| **Inštalačný path** | `/navstevy-app/` |

---

## 👥 Používatelia (role-based, dynamický)

Aplikácia **už nemá žiadne hardcoded mená** v biznis logike. Všetko sa riadi cez **USERS_DB** uloženú v backende (Cloudflare Worker, kľúč `users_v2`).

### Štruktúra používateľa
```json
{
  "name": "Filip",
  "pin": "1234",
  "color": "#007AFF",
  "role": "admin",
  "kad_scope": "team",
  "druhotky_kategorie": ["KPZ","COKO","GUM"]
}
```

### Role
| Rola | Práva |
|------|-------|
| `admin` | LIVE dashboard, pridávanie/mazanie userov, export CSV, edit obchodov, debug info |
| `user` | Štandardné používanie |

### KAD scope
| Scope | Význam |
|-------|--------|
| `team` | Uploader tímového KAD mema (zdieľané pre všetkých s scope `none`) |
| `self` | Má vlastné memo (`kad_memo_data_{name}`) |
| `none` | Iba čítanie tímového mema |

### Druhotky kategórie
Per-user pole, možné: `KPZ`, `COKO`, `GUM`, `PET`.

### Seed pri prvom spustení
Ak `users_v2` na backende neexistuje:
- **Filip** — admin + KAD team + (KPZ, COKO, GUM)
- **Mirka** — user + KAD self + (PET)
- **Ľubo** — user + KAD none + (KPZ, COKO, GUM)
- **Monika** — user + KAD none + (KPZ, COKO, GUM)
- **Ivana** — user + KAD none + (KPZ, COKO, GUM)

---

## 🔧 Pomocné JS funkcie (role-based API)

Namiesto `if(currentUser==='Filip')`:

| Funkcia | Vracia |
|---------|--------|
| `currentUserObj()` | Objekt aktuálneho usera |
| `isAdmin()` | `true` ak admin |
| `isAdminUser(name)` | Test konkrétneho usera |
| `getKadScope()` | `'team'`/`'self'`/`'none'` |
| `getDruhotkyKat()` | Pole kategórií |
| `getUserColor(name)` | Hex farba |
| `getUserInitial(name)` | Iniciála (`Ľ` pre Ľuba) |
| `hasShops(name?)` | Či má priradené obchody |
| `kadTeamUploaderName()` | Meno tímového uploadera |

### Správa USERS_DB
| Funkcia | Účel |
|---------|------|
| `getUserObj(name)` | Načítaj usera |
| `rebuildLegacyMaps()` | Prebuduj legacy `PINS`/`USERS`/`userColors` |
| `saveUsersDB()` | Ulož do localStorage + backendu |
| `loadUsersDBFromBackend(cb)` | Stiahni pri štarte |
| `renderUserCards()` | Vykresli karty na úvodnej obrazovke |

---

## 🏗 Architektúra

```
PWA (index.html) → Cloudflare Worker (workers.dev)
  ↑
  USERS_DB (users_v2 key)
```

### Externé závislosti
- Inter font, Material Symbols (Google Fonts)
- SheetJS / xlsx 0.18.5 (KAD memo)

---

## 🧭 Hlavné sekcie

1. **Prehľad** — dashboard s ring grafmi
2. **Kalendár / Dochádzka** — mesačný kalendár, detail dňa
3. **Sklad** — 5 pod-tabov pre žuvačky (Orbit/Airwaves)
4. **Štatistiky** — Q1–Q4, MARS perioda
5. **Obchody** — predajne; edit iba `admin`
6. **Druhotky** — kategórie podľa user setting
7. **Poznámky** — filter, foto
8. **Akcie / KAD memo** — upload podľa `kad_scope`
9. **Viac** — rozcestník + Settings

---

## 💾 Dátový model

### Globálne kľúče
| Kľúč | Obsah |
|------|-------|
| `users_v2` | **USERS_DB** (master) |
| `settings_dark` | Dark mode |
| `app_title` | Titulok |
| `kad_memo_data` | Zdieľané KAD memo |

### Per-user kľúče
| Vzor | Obsah |
|------|-------|
| `{name}_d_YYYY-MM-DD` | Záznam dňa |
| `pozn_{name}` | Poznámky |
| `druh_{name}_YYYY` | Druhotky |
| `kad_memo_data_{name}` | Osobné KAD memo |
| `goals_{name}` | Ciele |
| `obchody_overrides_{name}` | Úpravy obchodov |
| `avatar_{name}` | Avatar |

---

## 🔐 Autentifikácia

1. **PIN** — z `USERS_DB[i].pin` (cez `rebuildLegacyMaps()`)
2. **Face ID / Touch ID** — WebAuthn
3. **Remember me** — 365 dní

Master PIN `1234` — funguje pre všetkých.

---

## 🌐 Backend API

**Worker URL:** `https://worker-summer-band-b0f5.fildoo-kubica.workers.dev`

- `GET /` — celý dataset
- `GET /?key=X` — jeden kľúč
- `GET /?key=X&value=Y` — uložiť (malé)
- `POST /` body `{"key":"X","value":"Y"}` — uložiť (veľké)

---

## 📵 Offline-first

- Service Worker cachuje statické súbory
- Network-first pre HTML
- Offline queue v localStorage
- Auto-update banner každých 10 min

### Pri každom deploy
1. Bump `CACHE_NAME` v `sw.js`
2. Bump `APP_VERSION` v `index.html` (musí byť rovnaké)
3. Nahrať `index.html`, `sw.js`, `manifest.json`

---

## 🛠 Admin panel (Settings → ⚙️ Admin)

Iba pre rolu `admin`:
- Pridanie užívateľa (meno, PIN, farba, rola, KAD scope, druhotky kategórie)
- Mazanie užívateľa (okrem posledného admina)
- Export CSV
- LIVE dashboard
- Pin generator, Clear day

---

## ⚙️ Otvorené body / TODO

- [ ] **Edit existujúceho usera** — momentálne treba zmazať a vytvoriť znovu
- [ ] **Migrácia OBCHODY** — stále hardcoded v JS
- [ ] **Master PIN `1234`** — bezpečnosť
- [ ] **Backend URL plaintext** — verejne viditeľná
- [ ] CSS triedy `dot-filip`, `dot-lubo`… (legacy, nepoužívané)

---

## 📚 Slovník

| Skratka | Význam |
|---------|--------|
| KAD | Key Account Department |
| CD | Cestovný / Centrála Deň |
| PN | Práceneschopnosť |
| MARS perioda | Vlastné fiškálne obdobie |
| SM, T3, MIX, SII | Typy COOP predajní |
| PJ | Prevádzková jednotka |
| C&C | Cash & Carry |
| VO | Veľkoobchod |
| POT | Potraviny |

---

## 📋 Changelog

### v023 (2026-05)
- ✨ **Centrálny USERS_DB** — všetko zo servera (`users_v2`)
- ✨ **Role-based prístup** — `isAdmin()` namiesto `currentUser==='Filip'`
- ✨ **KAD scope** — `team`/`self`/`none`
- ✨ **Druhotky kategórie per-user** — konfigurovateľné
- ✨ **Dynamický render user-cards** — bez reloadu
- ✨ **Seed pri prvom spustení** — automatický prenos pôvodných userov
- 🐛 **Fix:** Pridaný user sa hneď zobrazí na úvodnej obrazovke

### v022 (predchádzajúca)
- Pôvodná verzia s hardcoded zoznamom 5 používateľov
