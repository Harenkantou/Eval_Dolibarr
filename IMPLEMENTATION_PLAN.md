# Plan d'Implémentation : Module Salaires (FrontOffice)

## Contexte
Ce module permet de gérer les salariés et leurs salaires dans une application Vue 3 + Vite + Supabase.

---

## Architecture du Projet

### Structure actuelle
```
NewApp_Dolibarr/
├── src/
│   ├── main.js          # Point d'entrée
│   └── App.vue          # Composant racine
```

### Structure cible
```
NewApp_Dolibarr/
├── src/
│   ├── main.js                    # Point d'entrée (+ router, + pinia)
│   ├── App.vue                    # Composant racine (+ router-view)
│   ├── router/
│   │   └── index.js               # Routes de l'application
│   ├── stores/
│   │   ├── salarie.store.js       # Store Pinia pour les salariés
│   │   └── salaire.store.js       # Store Pinia pour les salaires
│   ├── views/
│   │   ├── SalarieList.vue        # Page liste des salariés (avec recherche)
│   │   ├── SalarieCreate.vue      # Page création salaire
│   │   └── SalariePay.vue         # Page paiement salaire (en plusieurs fois)
│   ├── components/
│   │   ├── SearchFilters.vue      # Composant recherche multi-critères
│   │   ├── SalarieCard.vue        # Carte salarié
│   │   ├── SalaireForm.vue        # Formulaire création salaire
│   │   └── PaymentHistory.vue    # Historique des paiements
│   ├── api/
│   │   └── supabase.js            # Client Supabase
│   └── utils/
│       └── format.js              # Utilitaires de formatage
```

---

## Étapes d'Implémentation

### Phase 1 : Base de données (Supabase)

#### Étape 1.1 : Créer les tables

**Table `salaries` (Salariés)**
```sql
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telephone VARCHAR(20),
  poste VARCHAR(100),
  date_embauche DATE,
  salaire_mensuel DECIMAL(10,2) NOT NULL DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'actif', -- actif, inactif
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table `salaires` (Fiches de paie)**
```sql
CREATE TABLE salaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salarie_id UUID NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
  mois INTEGER NOT NULL, -- 1-12
  annee INTEGER NOT NULL,
  montant_total DECIMAL(10,2) NOT NULL,
  montant_paye DECIMAL(10,2) DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'en_attente', -- en_attente, partiel, paye
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(salarie_id, mois, annee)
);
```

**Table `paiements` (Paiements individuels)**
```sql
CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salaire_id UUID NOT NULL REFERENCES salaires(id) ON DELETE CASCADE,
  montant DECIMAL(10,2) NOT NULL,
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  mode_paiement VARCHAR(50) DEFAULT 'virement', -- virement, cheque, especes
  reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Étape 1.2 : Activer RLS (Row Level Security)
```sql
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Pour une app sans auth, autoriser tout le monde
CREATE POLICY "allow_all_salaries" ON salaries FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_salaires" ON salaires FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_paiements" ON paiements FOR ALL
  TO anon, authenticated USING (true) WITH CHECK (true);
```

---

### Phase 2 : Configuration Vue (Router + Pinia)

#### Étape 2.1 : Configurer le router
```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/salaries' },
  { path: '/salaries', name: 'SalarieList', component: () => import('@/views/SalarieList.vue') },
  { path: '/salaries/:id/pay', name: 'SalariePay', component: () => import('@/views/SalariePay.vue') },
  { path: '/salaries/:id/create-salary', name: 'SalarieCreateSalary', component: () => import('@/views/SalarieCreate.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

#### Étape 2.2 : Configurer Pinia
```javascript
// src/main.js - Ajouter router et pinia
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

---

### Phase 3 : Client Supabase

#### Étape 3.1 : Créer le client
```javascript
// src/api/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### Étape 3.2 : Variables d'environnement
Créer un fichier `.env` dans NewApp_Dolibarr/ :
```
VITE_SUPABASE_URL=<url_supabase>
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

### Phase 4 : Stores Pinia

#### Étape 4.1 : Store Salariés
```javascript
// src/stores/salarie.store.js
import { defineStore } from 'pinia'
import { supabase } from '@/api/supabase'

export const useSalarieStore = defineStore('salarie', {
  state: () => ({
    salaries: [],
    currentSalarie: null,
    loading: false,
    filters: {
      search: '',
      statut: '',
      poste: ''
    }
  }),

  getters: {
    filteredSalaries: (state) => {
      return state.salaries.filter(s => {
        const matchSearch = !state.filters.search ||
          s.nom.toLowerCase().includes(state.filters.search.toLowerCase()) ||
          s.prenom.toLowerCase().includes(state.filters.search.toLowerCase()) ||
          s.email?.toLowerCase().includes(state.filters.search.toLowerCase())
        const matchStatut = !state.filters.statut || s.statut === state.filters.statut
        const matchPoste = !state.filters.poste || s.poste?.includes(state.filters.poste)
        return matchSearch && matchStatut && matchPoste
      })
    }
  },

  actions: {
    async fetchSalaries() {
      this.loading = true
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .order('nom')
      if (!error) this.salaries = data
      this.loading = false
    },

    async fetchSalarie(id) {
      const { data } = await supabase
        .from('salaries')
        .select('*, salaires(*, paiements(*))')
        .eq('id', id)
        .single()
      this.currentSalarie = data
      return data
    },

    async createSalarie(salarie) {
      const { data, error } = await supabase
        .from('salaries')
        .insert(salarie)
        .select()
        .single()
      if (!error) this.salaries.push(data)
      return { data, error }
    }
  }
})
```

#### Étape 4.2 : Store Salaires
```javascript
// src/stores/salaire.store.js
import { defineStore } from 'pinia'
import { supabase } from '@/api/supabase'

export const useSalaireStore = defineStore('salaire', {
  state: () => ({
    currentSalaire: null,
    loading: false
  }),

  actions: {
    async createSalaire(salaire) {
      const { data, error } = await supabase
        .from('salaires')
        .insert(salaire)
        .select()
        .single()
      return { data, error }
    },

    async addPaiement(salaireId, paiement) {
      // 1. Insérer le paiement
      const { data: newPaiement, error } = await supabase
        .from('paiements')
        .insert({ ...paiement, salaire_id: salaireId })
        .select()
        .single()

      if (error) return { error }

      // 2. Recalculer le montant payé
      const { data: paiements } = await supabase
        .from('paiements')
        .select('montant')
        .eq('salaire_id', salaireId)

      const totalPaye = paiements.reduce((sum, p) => sum + p.montant, 0)

      // 3. Mettre à jour le statut
      const { data: salaire } = await supabase
        .from('salaires')
        .select('montant_total')
        .eq('id', salaireId)
        .single()

      const statut = totalPaye >= salaire.montant_total ? 'paye' 
                   : totalPaye > 0 ? 'partiel' 
                   : 'en_attente'

      await supabase
        .from('salaires')
        .update({ montant_paye: totalPaye, statut })
        .eq('id', salaireId)

      return { data: newPaiement }
    },

    async getSalaireWithPaiements(salaireId) {
      const { data } = await supabase
        .from('salaires')
        .select('*, paiements(*)')
        .eq('id', salaireId)
        .single()
      this.currentSalaire = data
      return data
    }
  }
})
```

---

### Phase 5 : Composants et Vues

#### Étape 5.1 : Composant SearchFilters.vue
```vue
<!-- src/components/SearchFilters.vue -->
<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  filters: Object
})

const emit = defineEmits(['update:filters'])

function updateFilter(key, value) {
  emit('update:filters', { ...props.filters, [key]: value })
}
</script>

<template>
  <div class="search-filters">
    <input 
      type="text" 
      placeholder="Rechercher (nom, prénom, email)..."
      :value="filters.search"
      @input="updateFilter('search', $event.target.value)"
    />
    <select 
      :value="filters.statut"
      @change="updateFilter('statut', $event.target.value)"
    >
      <option value="">Tous les statuts</option>
      <option value="actif">Actif</option>
      <option value="inactif">Inactif</option>
    </select>
    <input 
      type="text" 
      placeholder="Filtrer par poste..."
      :value="filters.poste"
      @input="updateFilter('poste', $event.target.value)"
    />
  </div>
</template>
```

#### Étape 5.2 : Vue SalarieList.vue
```vue
<!-- src/views/SalarieList.vue -->
<script setup>
import { onMounted, computed } from 'vue'
import { useSalarieStore } from '@/stores/salarie.store'
import { useRouter } from 'vue-router'
import SearchFilters from '@/components/SearchFilters.vue'

const store = useSalarieStore()
const router = useRouter()

onMounted(() => store.fetchSalaries())

function goToPay(salarieId) {
  router.push(`/salaries/${salarieId}/pay`)
}

function createSalary(salarieId) {
  router.push(`/salaries/${salarieId}/create-salary`)
}
</script>

<template>
  <div class="salarie-list">
    <h1>Liste des Salariés</h1>
    
    <SearchFilters 
      :filters="store.filters" 
      @update:filters="store.filters = $event" 
    />
    
    <div v-if="store.loading">Chargement...</div>
    
    <table v-else>
      <thead>
        <tr>
          <th>Nom</th>
          <th>Email</th>
          <th>Poste</th>
          <th>Salaire mensuel</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in store.filteredSalaries" :key="s.id">
          <td>{{ s.prenom }} {{ s.nom }}</td>
          <td>{{ s.email }}</td>
          <td>{{ s.poste }}</td>
          <td>{{ s.salaire_mensuel }} €</td>
          <td>{{ s.statut }}</td>
          <td>
            <button @click="createSalary(s.id)">Créer salaire</button>
            <button @click="goToPay(s.id)">Payer</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

#### Étape 5.3 : Vue SalarieCreate.vue (Création salaire)
```vue
<!-- src/views/SalarieCreate.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalarieStore } from '@/stores/salarie.store'
import { useSalaireStore } from '@/stores/salaire.store'

const route = useRoute()
const router = useRouter()
const salarieStore = useSalarieStore()
const salaireStore = useSalaireStore()

const salarieId = route.params.id
const form = ref({
  mois: new Date().getMonth() + 1,
  annee: new Date().getFullYear(),
  montant_total: 0
})

onMounted(async () => {
  const salarie = await salarieStore.fetchSalarie(salarieId)
  form.value.montant_total = salarie.salaire_mensuel
})

async function submit() {
  await salaireStore.createSalaire({
    ...form.value,
    salarie_id: salarieId
  })
  router.push(`/salaries/${salarieId}/pay`)
}
</script>

<template>
  <div class="salarie-create">
    <h1>Créer une fiche de paie</h1>
    
    <form @submit.prevent="submit">
      <label>Mois</label>
      <select v-model="form.mois">
        <option v-for="m in 12" :key="m" :value="m">
          {{ new Date(2024, m-1).toLocaleDateString('fr', { month: 'long' }) }}
        </option>
      </select>
      
      <label>Année</label>
      <input type="number" v-model="form.annee" />
      
      <label>Montant total (€)</label>
      <input type="number" step="0.01" v-model="form.montant_total" />
      
      <button type="submit">Créer</button>
    </form>
  </div>
</template>
```

#### Étape 5.4 : Vue SalariePay.vue (Paiement en plusieurs fois)
```vue
<!-- src/views/SalariePay.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSalarieStore } from '@/stores/salarie.store'
import { useSalaireStore } from '@/stores/salaire.store'

const route = useRoute()
const salarieStore = useSalarieStore()
const salaireStore = useSalaireStore()

const salarie = computed(() => salarieStore.currentSalarie)
const nouveauPaiement = ref({
  montant: 0,
  mode_paiement: 'virement',
  reference: '',
  notes: ''
})

onMounted(() => {
  salarieStore.fetchSalarie(route.params.id)
})

async function payer() {
  // Trouver le salaire en cours
  const salaireEnCours = salarie.value?.salaires?.find(s => s.statut !== 'paye')
  if (!salaireEnCours) return alert('Aucun salaire en attente')
  
  await salaireStore.addPaiement(salaireEnCours.id, nouveauPaiement.value)
  await salarieStore.fetchSalarie(route.params.id)
  
  nouveauPaiement.value = { montant: 0, mode_paiement: 'virement', reference: '', notes: '' }
}
</script>

<template>
  <div class="salarie-pay">
    <h1>Paiement Salaire - {{ salarie?.prenom }} {{ salarie?.nom }}</h1>
    
    <!-- Fiche de paie en cours -->
    <div v-for="salaire in salarie?.salaires" :key="salaire.id" class="salaire-card">
      <h3>{{ salaire.mois }}/{{ salaire.annee }}</h3>
      <p>Total: {{ salaire.montant_total }} €</p>
      <p>Payé: {{ salaire.montant_paye }} €</p>
      <p>Reste: {{ salaire.montant_total - salaire.montant_paye }} €</p>
      <p>Statut: {{ salaire.statut }}</p>
      
      <!-- Historique paiements -->
      <div v-for="p in salaire.paiements" :key="p.id" class="paiement-item">
        {{ p.date_paiement }} - {{ p.montant }} € ({{ p.mode_paiement }})
      </div>
      
      <!-- Formulaire nouveau paiement -->
      <form v-if="salaire.statut !== 'paye'" @submit.prevent="payer">
        <input type="number" step="0.01" v-model="nouveauPaiement.montant" placeholder="Montant" />
        <select v-model="nouveauPaiement.mode_paiement">
          <option value="virement">Virement</option>
          <option value="cheque">Chèque</option>
          <option value="especes">Espèces</option>
        </select>
        <input type="text" v-model="nouveauPaiement.reference" placeholder="Référence" />
        <button type="submit">Payer</button>
      </form>
    </div>
  </div>
</template>
```

---

## Récapitulatif des Fonctions Nécessaires

### API Supabase (CRUD)

| Fonction | Table | Action |
|----------|-------|--------|
| `fetchSalaries()` | salaries | SELECT * |
| `fetchSalarie(id)` | salaries + salaires + paiements | SELECT avec JOIN |
| `createSalarie(data)` | salaries | INSERT |
| `createSalaire(data)` | salaires | INSERT |
| `addPaiement(salaireId, data)` | paiements + salaires | INSERT + UPDATE |
| `getSalaireWithPaiements(id)` | salaires + paiements | SELECT avec JOIN |

### Stores Pinia

| Store | Méthode | Description |
|-------|---------|-------------|
| salarieStore | `fetchSalaries()` | Charge tous les salariés |
| salarieStore | `fetchSalarie(id)` | Charge un salarié avec ses salaires |
| salarieStore | `filteredSalaries` | Getter pour filtrer par critères |
| salaireStore | `createSalaire(data)` | Crée une fiche de paie |
| salaireStore | `addPaiement(id, data)` | Ajoute un paiement et met à jour le total |

### Composants Vue

| Composant | Usage |
|-----------|-------|
| `SalarieList.vue` | Liste avec filtres multi-critères |
| `SalarieCreate.vue` | Création d'une fiche de paie |
| `SalariePay.vue` | Paiement en plusieurs fois |
| `SearchFilters.vue` | Barre de recherche multi-critères |

---

## Ordre d'Implémentation

1. **Phase 1** : Créer les tables Supabase + RLS
2. **Phase 2** : Configurer router et Pinia dans main.js
3. **Phase 3** : Créer le client Supabase
4. **Phase 4** : Créer les stores (salarie.store.js, salaire.store.js)
5. **Phase 5** : Créer les composants et vues
6. **Phase 6** : Tester le flux complet

---

## Points d'Attention

- **Paiement en plusieurs fois** : Chaque paiement ajoute une ligne dans `paiements`, le total est recalculé automatiquement
- **Statut automatique** : `en_attente` -> `partiel` -> `paye` selon le montant payé
- **Recherche multi-critères** : Filtre sur nom, prénom, email, statut, poste simultanément
