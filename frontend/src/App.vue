<script setup>
import { onMounted, ref } from 'vue'
import { api } from './api'

const health = ref(null)
const collections = ref([])
const selected = ref('')
const resources = ref({ total: 0, results: [] })
const users = ref({ count: 0, results: [] })
const loans = ref({ count: 0, results: [] })
const error = ref('')
const msg = ref('')

async function run(fn) {
  error.value = ''
  try { await fn() } catch (e) { error.value = e.message }
}

const loadResources = () => run(async () => (resources.value = await api.resources(selected.value)))
const loadLoans = () => run(async () => (loans.value = await api.loans()))

// Flujo E2E de demostración: Vue -> Gateway -> loans-service -> Supabase
function demoLoan() {
  return run(async () => {
    const [student, librarian] = await Promise.all([api.users('estudiante'), api.users('bibliotecario')])
    const resource = resources.value.results[0]
    const loan = await api.createLoan({
      user: student.results[0].id,
      librarian: librarian.results[0].id,
      resource_code: resource.code,
      collection: resource.collection,
    })
    msg.value = `Préstamo #${loan.id} creado, vence ${new Date(loan.due_at).toLocaleString()}`
    await loadLoans()
  })
}

onMounted(() =>
  run(async () => {
    health.value = await api.health()
    collections.value = await api.collections()
    await loadResources()
    users.value = await api.users('estudiante')
    await loadLoans()
  })
)
</script>

<template>
  <main>
    <h1>Sistema de Gestión Bibliotecaria — Universidad de Madeira</h1>
    <p v-if="health" class="ok">
      Gateway → catálogo ({{ health[0].db }}): {{ health[0].status }} · préstamos ({{ health[1].db }}): {{ health[1].status }}
    </p>
    <p v-if="error" class="err">⚠ {{ error }}</p>
    <p v-if="msg" class="ok">{{ msg }}</p>

    <section>
      <h2>Catálogo <small>(servicio catalog · MongoDB)</small></h2>
      <select v-model="selected" @change="loadResources">
        <option value="">Todas las colecciones</option>
        <option v-for="c in collections" :key="c.name" :value="c.name">
          {{ c.name }} ({{ c.resources }}) · {{ c.loan_days }} d · {{ c.max_renewals }} renov.
        </option>
      </select>
      <table>
        <thead><tr><th>Código</th><th>Título</th><th>Colección</th><th>Estado</th><th>Disp.</th></tr></thead>
        <tbody>
          <tr v-for="r in resources.results" :key="r.code">
            <td>{{ r.code }}</td><td>{{ r.title }}</td><td>{{ r.collection }}</td>
            <td>{{ r.status }}</td><td>{{ r.available_copies ?? '—' }}/{{ r.total_copies ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
      <small>{{ resources.total }} recursos</small>
    </section>

    <section>
      <h2>Estudiantes <small>(servicio library · Supabase)</small></h2>
      <table>
        <thead><tr><th>Código</th><th>Nombre</th><th>Correo</th><th>Semestre</th></tr></thead>
        <tbody>
          <tr v-for="u in users.results" :key="u.id">
            <td>{{ u.codigo }}</td><td>{{ u.nombres }} {{ u.apellidos }}</td><td>{{ u.correo }}</td><td>{{ u.semestre }}</td>
          </tr>
        </tbody>
      </table>
      <small>{{ users.count }} estudiantes</small>
    </section>

    <section>
      <h2>Préstamos</h2>
      <button @click="demoLoan">Prestar el primer recurso listado al primer estudiante</button>
      <table>
        <thead><tr><th>#</th><th>Recurso</th><th>Colección</th><th>Vence</th><th>Devuelto</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in loans.results" :key="l.id">
            <td>{{ l.id }}</td><td>{{ l.resource_code }}</td><td>{{ l.collection }}</td>
            <td>{{ new Date(l.due_at).toLocaleString() }}</td>
            <td>{{ l.returned_at ? 'Sí' : 'No' }}</td>
            <td><button v-if="!l.returned_at" @click="run(async () => { await api.returnLoan(l.id); await loadLoans() })">Devolver</button></td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<style>
body { font-family: system-ui, sans-serif; margin: 0; background: #f6f7f9; color: #1c2430; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
section { background: #fff; border-radius: 8px; padding: 16px; margin: 16px 0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14px; }
th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e3e6ea; }
button, select { padding: 6px 10px; margin: 4px 0; }
.ok { color: #1a7f45; } .err { color: #b3261e; }
</style>
