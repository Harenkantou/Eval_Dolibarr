# Scénario de test — Majoration Samedi / Dimanche (Alea_J3)

Ce scénario teste la nouvelle condition ajoutée à la génération de salaire mensuelle :
cases à cocher **Samedi** / **Dimanche**, **champ unique** de majoration week-end,
et priorité **max(majoration week-end, majoration férié)** quand un week-end coché est aussi férié.

Vue testée : **« Générer par mois (avec jours fériés) »**
Route : `/frontoffice/salaries/generate-monthly` → `SalarieGenerateNew.vue`

---

## 1. Fichiers de test fournis

| Fichier | Rôle |
|---|---|
| `employes_test_weekend.csv` | 2 salariés de test (ref 101, 102) |
| `salaires_test_weekend.csv` | 1 salaire de **référence** par salarié en **août 2026** |

> ⚠️ La génération ne produit des lignes **que pour les salariés qui possèdent déjà
> au moins un salaire dans le mois ciblé** (règle des « intervalles libres »).
> Les salaires de référence ci-dessus servent à ouvrir cet intervalle.

---

## 2. Pré-requis (à faire avant le test)

1. **Importer les CSV** via le back-office (`/backoffice/import`) :
   - Fichier 1 = `employes_test_weekend.csv`
   - Fichier 2 = `salaires_test_weekend.csv`
2. **Configurer le jour férié** dans le back-office (`/backoffice/jours-feries`) :
   - Libellé : `Assomption`
   - Date : `2026-08-15`
   - Récurrent : `oui`
   - 👉 Le **15/08/2026 tombe un SAMEDI** : c'est le cœur du test (collision week-end + férié).

---

## 3. Calendrier d'août 2026 (repères)

| Type | Jours du mois |
|---|---|
| Samedis | **1, 8, 15, 22, 29** |
| Dimanches | **2, 9, 16, 23, 30** |
| Férié | **15/08 (Assomption) = un samedi** |

- Salarié **101** : référence 01→09/08 ⇒ **intervalle libre = 10 → 31 août**
- Salarié **102** : référence 01→05/08 ⇒ **intervalle libre = 06 → 31 août**

---

## 4. Paramètres de génération à saisir

| Champ | Valeur |
|---|---|
| Mois | Août |
| Année | 2026 |
| Salaire / jour (€) | **50** |
| Majoration jour férié (%) | **150** |
| Majoration week-end (%) | **100** |

---

## 5. Cas de test & résultats attendus

### ▶ Cas A — Samedi **ET** Dimanche cochés

C'est le cas de référence. Le samedi 15/08 est férié **et** coché → on applique
`max(100 %, 150 %) = 150 %`.

**Salarié 101 (intervalle 10 → 31)**

| Catégorie | Nb jours | Détail | Montant |
|---|---|---|---|
| Jours normaux (Lun–Ven) | 16 | 16 × 50 | 800,00 € |
| Samedis | 3 | 22 & 29 (×100 %) = 200 · **15 férié (×150 %) = 125** | 325,00 € |
| Dimanches | 3 | 16, 23, 30 (×100 %) | 300,00 € |
| **Maj. samedi** (déductible) | — | 50 + 50 + 75 | **175,00 €** |
| **Maj. dimanche** (déductible) | — | 50 + 50 + 50 | **150,00 €** |
| **TOTAL 101** | | | **1 425,00 €** |

**Salarié 102 (intervalle 06 → 31)**

| Catégorie | Nb jours | Montant |
|---|---|---|
| Jours normaux | 18 | 900,00 € |
| Samedis (8, 22, 29 ×100 % + 15 férié ×150 %) | 4 | 425,00 € |
| Dimanches (9, 16, 23, 30 ×100 %) | 4 | 400,00 € |
| Maj. samedi | — | 225,00 € |
| Maj. dimanche | — | 200,00 € |
| **TOTAL 102** | | **1 725,00 €** |

**TOTAL GÉNÉRAL attendu : `3 150,00 €`** (2 lignes)

---

### ▶ Cas B — Aucune case cochée (comportement par défaut)

Les samedis et dimanches ne sont **pas payés**. Seuls les jours de semaine comptent.

| Salarié | Jours normaux | Total |
|---|---|---|
| 101 | 16 | **800,00 €** |
| 102 | 18 | **900,00 €** |

**TOTAL GÉNÉRAL attendu : `1 700,00 €`**

> ✅ Vérifie que, décoché, le champ « Majoration week-end » est **désactivé** (grisé).

---

### ▶ Cas C — Samedi coché uniquement

Les dimanches restent exclus ; le 15/08 (samedi férié) prend toujours 150 %.

| Salarié | Normaux | Samedis | Maj. samedi | Total |
|---|---|---|---|---|
| 101 | 16 | 3 | 175,00 € | **1 125,00 €** |
| 102 | 18 | 4 | 225,00 € | **1 325,00 €** |

**TOTAL GÉNÉRAL attendu : `2 450,00 €`**

---

## 6. Points de contrôle (checklist)

- [ ] **Cas A** : total = 3 150 € ; colonne *Maj. samedi* du salarié 101 = 175 € (déduction individuelle OK).
- [ ] **15/08 pris à 150 %** et non 100 % → le max férié/week-end est bien appliqué.
- [ ] **Cas B** : samedis/dimanches à 0, total = 1 700 €, champ week-end grisé.
- [ ] **Cas C** : dimanches exclus, samedis inclus, total = 2 450 €.
- [ ] Un intervalle **composé uniquement de week-ends non cochés** ne génère **aucune** ligne.
- [ ] Après « Générer », relancer avec les mêmes critères ne re-propose plus les jours déjà couverts.

---

## 7. Test automatisé rapide (sans UI)

Vérification pure de la logique métier via Node (depuis `NewApp_Dolibarr/`) :

```bash
node --input-type=module -e "
import { buildPreview, previewTotal } from './src/services/salaryGenerationService.js'
const ts=(d,m,y)=>Math.floor(Date.UTC(y,m-1,d)/1000)
const employees=[{id:101,name:'T1'},{id:102,name:'T2'}]
const salaries=[
  {fk_user:101,datesp:ts(1,8,2026),dateep:ts(9,8,2026)},
  {fk_user:102,datesp:ts(1,8,2026),dateep:ts(5,8,2026)},
]
const jf=[{dateFerie:'2026-08-15',recurrent:true}]
const p=buildPreview(employees,salaries,{
  month:8,year:2026,dailyAmount:50,majorationPct:150,
  weekendMajorationPct:100,includeSaturday:true,includeSunday:true,joursFeries:jf
})
console.log(p)
console.log('TOTAL', previewTotal(p))   // attendu : 3150
"
```
