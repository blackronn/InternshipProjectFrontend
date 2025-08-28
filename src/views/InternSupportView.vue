<!-- src/views/InternSupportView.vue -->
<template>
  <div class="intern-support-page">
    <h1>{{ $t('internSupport.title') }}</h1>

    <div class="form">
      <!-- 1. Satır: Stajyer Seçimi -->
      <div class="row">
        <div class="field full-width">
          <label>{{ $t('internSupport.intern') }}:</label>
          <select v-model="selectedIntern">
            <option disabled value="">-- {{ $t('common.select') }} --</option>
            <option
              v-for="intern in interns"
              :key="intern.id"
              :value="intern.id"
            >
              {{ intern.name }} {{ intern.surname }}
            </option>
          </select>
        </div>
      </div>

      <!-- 2. Satır: IK -->
      <div class="row">
        <div class="field">
          <label>{{ $t('internSupport.hrName') }}:</label>
          <input
            class="name-input"
            v-model="hrName"
            @input="hrName = hrName.toUpperCase()"
          />
        </div>
        <div class="field">
          <label>{{ $t('internSupport.hrEmail') }}:</label>
          <div class="email-input">
            <input v-model="hrLocal" @input="hrLocal = hrLocal.toLowerCase()" />
            <span>@etiya.com</span>
          </div>
        </div>
      </div>

      <!-- 3. Satır: IT -->
      <div class="row">
        <div class="field">
          <label>{{ $t('internSupport.itName') }}:</label>
          <input
            class="name-input"
            v-model="itName"
            @input="itName = itName.toUpperCase()"
          />
        </div>
        <div class="field">
          <label>{{ $t('internSupport.itEmail') }}:</label>
          <div class="email-input">
            <input v-model="itLocal" @input="itLocal = itLocal.toLowerCase()" />
            <span>@etiya.com</span>
          </div>
        </div>
      </div>

      <!-- 4. Satır: Buton -->
      <div class="row">
        <button class="assign-btn" @click="assign">
          {{ $t('internSupport.assign') }}
        </button>
      </div>
    </div>

    <!-- Atama tablosu -->
    <div
      v-if="selectedIntern !== null && assignments.length > 0"
      class="assignments-table"
    >
      <h3>{{ $t('internSupport.existingAssignments') }}</h3>
      <table>
        <thead>
          <tr>
            <th>{{ $t('internSupport.department') }}</th>
            <th>{{ $t('internSupport.name') }}</th>
            <th>{{ $t('internSupport.email') }}</th>
            <th>{{ $t('internSupport.action') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in assignments" :key="a.id">
            <td>{{ a.departmentName }}</td>
            <td>{{ a.supervisorName }}</td>
            <td>{{ a.supervisorEmail }}</td>
            <td>
              <button class="delete-btn" @click="deleteAssignment(a.id)">
                {{ $t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { msalApp } from '@/main';
import api from '@/utils/apiClients';

const { t } = useI18n();

interface Intern {
  id: number;
  name: string;
  surname: string;
}
interface Assignment {
  id: number;
  departmentName: string;
  supervisorName: string;
  supervisorEmail: string;
}

const interns = ref<Intern[]>([]);
const assignments = ref<Assignment[]>([]);
const selectedIntern = ref<number | null>(null);
const hrName = ref('');
const hrLocal = ref('');
const itName = ref('');
const itLocal = ref('');

watch(selectedIntern, async id => {
  if (id === null) {
    assignments.value = [];
  } else {
    const res = await api.get<Assignment[]>('/api/supervisors', {
      params: { internId: id },
    });
    assignments.value = res.data;
  }
});

onMounted(async () => {
  try {
    const email = msalApp.getActiveAccount()?.username || '';
    const { data: m } = await api.get<{ id: number }>(
      `/api/mentors/email/${email}`
    );
    const resp = await api.get<Intern[]>(`/api/interns/mentor/${m.id}`);
    interns.value = resp.data;
  } catch {
    alert(t('internSupport.fetchError'));
  }
});

async function assign() {
  const hasHR = assignments.value.some(
    a => a.departmentName === 'İnsan Kaynakları'
  );
  const hasIT = assignments.value.some(
    a => a.departmentName === 'Bilgi Teknolojileri'
  );

  if (hasHR && hasIT) {
    return alert(t('internSupport.alreadyAssigned'));
  }
  if (selectedIntern.value === null) {
    return alert(t('internSupport.selectIntern'));
  }
  if ((!hrName.value || !hrLocal.value) && (!itName.value || !itLocal.value)) {
    return alert(t('internSupport.enterOneSupport'));
  }

  try {
    if (hrName.value && hrLocal.value) {
      await api.post('/api/supervisors', {
        internId: selectedIntern.value,
        supervisorDepartmentId: 1,
        supervisorName: hrName.value,
        supervisorEmail: `${hrLocal.value}@etiya.com`,
      });
    }
    if (itName.value && itLocal.value) {
      await api.post('/api/supervisors', {
        internId: selectedIntern.value,
        supervisorDepartmentId: 2,
        supervisorName: itName.value,
        supervisorEmail: `${itLocal.value}@etiya.com`,
      });
    }

    const res = await api.get<Assignment[]>('/api/supervisors', {
      params: { internId: selectedIntern.value },
    });
    assignments.value = res.data;
    hrName.value = hrLocal.value = itName.value = itLocal.value = '';
    alert(t('internSupport.success'));
  } catch {
    alert(t('internSupport.error'));
  }
}

async function deleteAssignment(id: number) {
  if (!confirm(t('common.confirmDelete'))) return;
  try {
    await api.delete(`/api/supervisors/${id}`);
    assignments.value = assignments.value.filter(x => x.id !== id);
    hrName.value = hrLocal.value = itName.value = itLocal.value = '';
  } catch {
    alert(t('internSupport.deleteError'));
  }
}
</script>

<style scoped>
.intern-support-page {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}
h1 {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form {
  display: grid;
  gap: 1rem;
}
.row {
  display: flex;
  gap: 1rem;
}
.field {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.full-width {
  flex: 1 1 100%;
}
.field label {
  margin-bottom: 0.25rem;
  font-weight: 500;
}

select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  appearance: none;
  font-size: 1rem;
}

.name-input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  text-transform: uppercase;
}

.email-input {
  display: flex;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}
.email-input input {
  padding: 0.5rem;
  border: none;
  flex: 1;
  text-transform: lowercase;
}
.email-input span {
  display: flex;
  align-items: center;
  padding: 0 0.6rem;
  background: #f0f0f0;
  border-left: 1px solid #ccc;
}

/* “Eşleştir” butonu */
.assign-btn {
  background: #242441;
  color: #fff;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
}
.assign-btn:hover {
  background: #003d99;
}

/* Atamalar tablosu */
.assignments-table {
  background: #fff;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 1.5rem;
}
.assignments-table table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 0.6rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}
th {
  background: #f7f9fc;
  font-weight: 600;
}

/* “Sil” butonu */
.delete-btn {
  background: #ff4d4d;
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
.delete-btn:hover {
  background: #d11a2a;
}
</style>
