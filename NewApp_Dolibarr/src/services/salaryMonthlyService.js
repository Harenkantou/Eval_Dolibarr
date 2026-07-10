import { round2 } from './formatService'

export const MONTH_NAMES = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']

export const monthLabel = (m) => MONTH_NAMES[m - 1]

const periodOf= (ts) => {
    const d = new Date(Number(ts) * 1000)
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() +  1}
}

export function listYears(salaries = []) {
    const years = new Set()
    for (const s of salaries) {
        if (!s.datesp) continue
        years.add(periodOf(s.datesp).year)
    }
    return [...years].sort((a,b) => b - a)
}


/**Construction d'un ligne par croisement
 * @params {Array} employees issus de getEmployees()
 * @params {Array} salaries issus de getSalaires()
 * @params {Objects} opts {year} filtre optionnel sur l'année
 * @return {Array} [{key, year, month, monthLabel,userId, name, ref, job, etc}]
 */

export function buildMonthlyRest(employees = [], salaries = [], { year = null } = {}) {
    const empById = new Map(employees.map(e => [String(e.id), e]))
    const rows = new Map()
    for(const s of salaries) {
        if (!s.datesp) continue
        const { year: y, month: m} = periodOf(s.datesp)
        if (year && y !== year ) continue

        const key = `${y}-${m}-${s.fk_user}`
        const emp = empById.get(String(s.fk_user))
        const row = rows.get(key) || {
            key,
            year    : y,
            month   : m,
            monthLabel  : monthLabel(m),
            userId  : s.fk_user,
            name    : emp?.name ?? `#${s.fk_user}`,
            ref : emp?.ref ?? null,
            job : emp?.job ?? null,
            lines   : [],
            due : 0,
            paid    : 0
        }
        row.lines.push(s)
        row.due += s.amount
        row.paid += s.totalPaye
        rows.set(key, row)
    }

    return [...rows.values()].map(r => {
        const rest = round2(r.due - r.paid)
        return {
            ...r,
            lines: r.lines.slice().sort((a,b) => (a.datesp || 0) - (b.datesp || 0)),
            due : round2(r.due),
            paid : round2(r.paid),
            rest,
            solde: rest <=0.001
        }
    })
}

/**Tri des lignes
 * @params {Array} rows
 * @params{Object} opts {by: 'month'|'name'|'rest', dir: 'asc'|'desc'}
 */
export function sortRows(rows = [], {by = 'month', dir= 'asc'} = {}) {
    const sign = dir === 'desc' ?-1 :1
    const byName = (a, b) => (a.name || '').localeCompare(b.name || '')

    return [...rows].sort((a, b) => {
        if(by === 'name') return sign * byName(a, b)
        if(by === 'rest') {
            if(a.rest !==b.rest) return sign * (a.rest - b.rest)
                return byName(a, b)
        }
        //by === 'month' : annéée puis nom
        if(a.year !== b.year) return sign * (a.year - b.year)
        if(a.month !== b.month) return sign *(a.month - b.month)
            return byName(a, b)
    })
}

//Filtre par recherche
/** @params {Object} filters { search, onlyRest } */

export function filterRows(rows = [], { search = '', onlyRest = false} = {}) {

    const q = search.trim().toLowerCase()
    return rows.filter(r => {
        const matchSearch = !q || (r.name || '').toLowerCase().includes(q) || String(r.ref ?? '').toLowerCase().includes(q)
        const matchRest = !onlyRest || !r.solde
        return matchSearch && matchRest
    })
}

//Totaux des ensembles
export function sumRows(rows = []) {
    const due = rows.reduce((s, r) => s + r.due, 0)
    const paid = rows.reduce((s, r) => s + r.paid, 0)
    return {
        count: rows.length,
        due  : round2(due),
        paid : round2(paid),
        rest : round2(due - paid)
    }
}

//Règlement d'un croisement
export function paymentsOfRow(row) {
    if (!row) return []
    return row.lines.flatMap(s => s.payments.map(p => ({
        ...p,
        salaryId: s.id,
        datesp  : s.datesp,
        dateep  : s.dateep
    })))
}
