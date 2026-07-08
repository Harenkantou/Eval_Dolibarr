# Logique adoptée — Majoration Samedi / Dimanche (Alea_J3)

Documentation des règles métier et des fonctions **ajoutées / modifiées** pour
intégrer la majoration des week-ends à la génération de salaire mensuelle.

---

## 1. Énoncé traduit en règles

| # | Règle de l'énoncé | Décision d'implémentation |
|---|---|---|
| 1 | Générer salaire : mois + année, salaire/jour + majoration | Existant, conservé |
| 2 | 2 cases à cocher **Samedi** / **Dimanche** ; cochées ⇒ on intègre ces jours | **Par défaut, les week-ends ne sont PAS payés.** Une case cochée intègre ce type de jour. |
| 3 | Un **seul** champ majoration week-end (jusqu'à 200 %) | Un champ `weekendMajorationPct` unique, appliqué aux samedis **et** dimanches |
| 4 | Jour férié un samedi coché : 100 vs 150 ⇒ prendre 150 | Pour un week-end **coché ET férié** : `max(majoration week-end, majoration férié)` |
| 5 | Pouvoir déduire la majoration samedi individuellement, idem dimanche | Le calcul expose `majSamedi` et `majDimanche` séparément |

**Priorité des majorations pour un jour donné :**

```
Jour de semaine (Lun–Ven)
    ├─ non férié  → +0 %
    └─ férié      → + majorationPct (férié)

Samedi
    ├─ non coché  → EXCLU (0 €, pas de ligne)
    └─ coché      → + max(weekendMajorationPct, férié ? majorationPct : 0)

Dimanche
    ├─ non coché  → EXCLU (0 €, pas de ligne)
    └─ coché      → + max(weekendMajorationPct, férié ? majorationPct : 0)
```

Formule du montant d'un jour inclus : `salaire_jour × (1 + pct/100)`.

---

## 2. Fichiers touchés

| Fichier | Nature |
|---|---|
| `src/services/salaryGenerationService.js` | Logique métier (pure) — **cœur du changement** |
| `src/views/frontoffice/SalarieGenerateNew.vue` | UI (formulaire, aperçu) |

Aucun changement côté API : `runSalaryGeneration()` (dans `api/dolibarr.js`)
n'utilise que `userId`, `total`, `start`, `end` de chaque ligne d'aperçu.

---

## 3. `salaryGenerationService.js`

### 3.1 Fonctions AJOUTÉES

```js
// Le jour est-il un samedi ? (getDay() : 0 = dimanche … 6 = samedi)
export function isSaturday(day, month, year) {
  return new Date(year, month - 1, day).getDay() === 6
}

// Le jour est-il un dimanche ?
export function isSunday(day, month, year) {
  return new Date(year, month - 1, day).getDay() === 0
}
```

### 3.2 `computeInterval()` — MODIFIÉE

**Avant :** chaque jour de l'intervalle était payé au tarif plein ; les fériés
recevaient la majoration. Les week-ends étaient donc payés comme des jours normaux.

**Après :** nouvelle signature avec 3 paramètres et un retour enrichi.

```js
export function computeInterval(interval, {
  month, year, dailyAmount, majorationPct,
  weekendMajorationPct = 0,   // ← NOUVEAU : % unique samedi + dimanche
  includeSaturday = false,    // ← NOUVEAU : case Samedi
  includeSunday   = false,    // ← NOUVEAU : case Dimanche
  joursFeries
}) {
  const daily    = parseFloat(dailyAmount) || 0
  const feriePct = parseFloat(majorationPct) || 0
  const weekPct  = parseFloat(weekendMajorationPct) || 0

  let total = 0
  let normal = 0, ferie = 0, samedi = 0, dimanche = 0
  let majFerie = 0, majSamedi = 0, majDimanche = 0

  for (let d = interval.start; d <= interval.end; d++) {
    const holiday = isHoliday(d, month, year, joursFeries)

    if (isSaturday(d, month, year)) {
      if (!includeSaturday) continue                 // non coché → pas payé
      const pct   = Math.max(weekPct, holiday ? feriePct : 0)   // ← règle du MAX
      const extra = daily * pct / 100
      total += daily + extra; majSamedi += extra; samedi++
      continue
    }

    if (isSunday(d, month, year)) {
      if (!includeSunday) continue
      const pct   = Math.max(weekPct, holiday ? feriePct : 0)
      const extra = daily * pct / 100
      total += daily + extra; majDimanche += extra; dimanche++
      continue
    }

    // Jour de semaine
    if (holiday) {
      const extra = daily * feriePct / 100
      total += daily + extra; majFerie += extra; ferie++
    } else {
      total += daily; normal++
    }
  }

  return {
    total: round2(total),
    normal, ferie, samedi, dimanche,
    majFerie:    round2(majFerie),
    majSamedi:   round2(majSamedi),   // ← déduction individuelle samedi
    majDimanche: round2(majDimanche)  // ← déduction individuelle dimanche
  }
}
```

Points clés :
- **`continue` si non coché** → le jour ne contribue ni au total ni aux compteurs.
- **`Math.max(weekPct, feriePct)`** → applique la règle « 100 et 150 ⇒ 150 » pour un
  week-end coché tombant un jour férié.
- **`majSamedi` / `majDimanche`** → part de majoration (en €) isolée par type de jour,
  ce qui permet de « déduire la majoration pour samedi individuellement ».

### 3.3 `buildPreview()` — MODIFIÉE

Ajout d'un filtre : un intervalle qui ne contient **que** des week-ends non cochés
(0 jour retenu) ne produit plus de ligne.

```js
const c = computeInterval(g, params)
if (c.normal + c.ferie + c.samedi + c.dimanche === 0) continue  // rien à générer
rows.push({ userId: e.id, name: e.name, start: g.start, end: g.end, ...c })
```

### 3.4 Inchangé

`daysInMonth`, `isHoliday`, `occupiedDays`, `freeIntervals`, `previewTotal`
gardent leur comportement. La sélection des **intervalles libres** (jours du mois
non déjà couverts par un salaire) reste le préalable à tout calcul.

---

## 4. `SalarieGenerateNew.vue`

### 4.1 State du formulaire (AJOUTS)

```js
const form = ref({
  month, year, dailyAmount,
  majorationPct: 50,
  includeSaturday: false,       // ← case Samedi
  includeSunday: false,         // ← case Dimanche
  weekendMajorationPct: 100     // ← champ unique week-end
})
```

### 4.2 Passage au service

Les 3 nouveaux paramètres sont transmis à `buildPreview()` dans le `computed` `preview`.

### 4.3 UI (AJOUTS)

- Bloc **« Options week-end »** : 2 cases à cocher + champ *Majoration week-end (%)*
  (max 200, **désactivé** tant qu'aucune case n'est cochée).
- Tableau d'aperçu enrichi de 4 colonnes : **Samedis**, **Dimanches**,
  **Maj. samedi**, **Maj. dimanche** (visualise la déduction individuelle).

---

## 5. Exemple chiffré (validé)

Août 2026 · salaire/jour 50 € · férié 150 % · week-end 100 % · 15/08 = samedi férié.

| Jour | Type | % appliqué | Montant |
|---|---|---|---|
| 22/08 | Samedi normal, coché | 100 % | 100,00 € |
| 15/08 | Samedi **+ férié**, coché | **max(100,150)=150 %** | 125,00 € |
| 16/08 | Dimanche normal, coché | 100 % | 100,00 € |
| 18/08 | Mardi normal | 0 % | 50,00 € |
| 22/08 | Samedi, **non coché** | — | 0,00 € (exclu) |

> Détail complet des totaux attendus : voir `SCENARIO_TEST_weekend.md`.
