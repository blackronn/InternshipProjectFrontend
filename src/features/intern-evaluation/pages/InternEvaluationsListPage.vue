<template>
  <div class="list-card">
    <div class="list-header">
      <h1>Stajyerlerim</h1>
      <span v-if="interns.length" class="count">{{ interns.length }} kişi</span>
    </div>

    <!-- Kaydet/Güncelle sonrası kısa mesaj -->
    <div v-if="toast" class="toast-success">{{ toast }}</div>

    <!-- Yükleniyor -->
    <div v-if="loading" class="loading">Yükleniyor…</div>

    <!-- Hata -->
    <div v-else-if="error" class="alert">
      {{ error }}
    </div>

    <!-- Tablo -->
    <table v-else-if="interns.length" class="grid-table">
      <thead>
        <tr>
          <th>Ad Soyad</th>
          <th>E-posta</th>
          <th>Birim</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in interns" :key="i.id">
          <td class="cell-strong">{{ fullName(i) }}</td>
          <td class="nowrap">{{ i.email || '—' }}</td>
          <td>{{ i.department || '—' }}</td>
          <td class="cell-actions">
            <button class="btn-primary" @click="goToForm(i.id)">
              {{ isEvaluated(i.id) ? 'Güncelle' : 'Değerlendir' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Boş durum -->
    <div v-else class="empty">Henüz size bağlı stajyer görünmüyor.</div>

    <!-- yalnız bypass açıkken -->
    <p v-if="showBypassHint" class="hint">
      * Geçici test: <code>localStorage.setItem('mentor_id','65')</code>
    </p>
  </div>
</template>

<style scoped>
/* Kart */
.list-card {
  max-width: 1040px;
  margin: 24px auto;
  background: #fff;
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
}
.list-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}
.count {
  color: #667085;
  font-size: 14px;
}

/* Uyarılar */
.loading {
  color: #475467;
}
.alert {
  background: #fff3f0;
  color: #8a2200;
  border: 1px solid #ffd6cc;
  border-radius: 10px;
  padding: 10px 12px;
}
.empty {
  color: #5f6c7b;
}

/* Tablo (Excel gibi çizgili) */
.grid-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid #d1d5db; /* dış çerçeve */
  border-radius: 12px;
  overflow: hidden;
}
.grid-table thead tr {
  background: #1f2a44; /* sidebar’a yakın lacivert */
}
.grid-table th {
  color: #fff;
  text-align: left;
  font-weight: 600;
  padding: 12px 14px;
  border: 1px solid #d1d5db; /* başlık hücre çizgileri */
}
.grid-table td {
  padding: 12px 14px;
  border: 1px solid #e5e7eb; /* satır-sütun çizgileri */
  color: #111827;
  vertical-align: middle;
}
.grid-table tbody tr:nth-child(even) {
  background: #fafafa;
}
.grid-table tbody tr:hover {
  background: #f5f7fb;
}

.cell-strong {
  font-weight: 600;
}
.cell-actions {
  text-align: right;
}
.nowrap {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Buton */
.btn-primary {
  background: #1f2a44;
  color: #fff;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  opacity: 0.92;
}
.btn-primary:focus {
  outline: 2px solid rgba(31, 42, 68, 0.35);
  outline-offset: 2px;
}

/* Bypass ipucu */
.hint {
  margin-top: 10px;
  color: #667085;
  font-size: 12px;
}

.toast-success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 12px;
  display: inline-block;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { fetchMentorInterns } from '../api/interns';
import { getEvaluationByMentorAndIntern } from '../api/evaluations';
import type { Intern } from '../types';
import { fullName } from '../types';

const router = useRouter();
const route = useRoute();

const interns = ref<Intern[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const toast = ref('');
const evaluatedMap = ref<Record<number, boolean>>({});

function isEvaluated(internId: number) {
  return !!evaluatedMap.value[internId];
}

function goToForm(internId: number) {
  router.push({ name: 'MentorEvaluationForm', params: { internId } });
}

onMounted(async () => {
  loading.value = true;

  // Formdan dönüşte gelen query bayrağına göre toast göster
  if (route.query.saved === '1') {
    toast.value = 'Değerlendirme kaydedildi.';
  } else if (route.query.updated === '1') {
    toast.value = 'Değerlendirme güncellendi.';
  }
  if (toast.value) {
    setTimeout(() => (toast.value = ''), 3000);
    // URL'deki bayrağı temizle (history’de kalmasın)
    router.replace({
      path: route.path,
      query: { ...route.query, saved: undefined, updated: undefined },
    });
  }

  try {
    const mentorIdRaw = localStorage.getItem('mentor_id');
    if (!mentorIdRaw) {
      error.value =
        'Mentor ID bulunamadı. (Console: localStorage.setItem("mentor_id","65"))';
      return;
    }
    const mentorId = Number(mentorIdRaw);
    if (Number.isNaN(mentorId)) {
      error.value = 'Mentor ID geçersiz.';
      return;
    }

    const rows = await fetchMentorInterns(mentorId);
    interns.value = rows;

    await Promise.all(
      rows.map(async it => {
        try {
          const exists = await getEvaluationByMentorAndIntern(mentorId, it.id);
          evaluatedMap.value[it.id] = !!exists;
        } catch {
          evaluatedMap.value[it.id] = false; // 404 gibi durumlar: yok kabul et
        }
      })
    );
  } catch (e: any) {
    error.value =
      e?.response?.data?.message || 'Liste alınırken bir hata oluştu.';
  } finally {
    loading.value = false;
  }
});
</script>
