<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  fetchAssignmentsPaged,
  type Assignment,
} from '@/utils/assignmentService';
import {
  createTimeLog,
  getTimeLogsByIntern,
  formatMinutesToHours,
} from '@/utils/timelogService';
import { useMsal } from 'vue3-msal-plugin';
import apiClient from '@/utils/apiClients';
import AppNotification from '@/components/AppNotification.vue';

const { t } = useI18n();

const assignments = ref<Assignment[]>([]);
const timeLogs = ref<any[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Bildirim durumu
const notificationMessage = ref('');
const notificationType = ref<'success' | 'error' | 'info'>('info');
const notificationShow = ref(false);

const showNotification = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) => {
  notificationShow.value = false;
  notificationMessage.value = message;
  notificationType.value = type;
  setTimeout(() => {
    notificationShow.value = true;
  }, 10);
};

const currentUserId = ref<number | null>(null);
const internStartDate = ref<string | null>(null);
const internEndDate = ref<string | null>(null);

const { accounts } = useMsal();
const email = accounts.value[0]?.username || '';

// Sadece bana ait görevler
const myAssignments = computed(() =>
  assignments.value.filter(a => (a as any).internId === currentUserId.value)
);

// Yalnızca "In Progress" durumundaki görevler
const isInProgress = (status: string | undefined) => {
  const s = String(status || '').toLowerCase();
  return (
    s === 'in progress' ||
    s.includes('progress') ||
    s === 'devam ediyor' ||
    s.includes('devam')
  );
};
const isCompleted = (status?: string) => {
  const s = String(status || '').toLowerCase();
  return s === 'completed' || s.includes('completed') || s === 'tamamlandı';
};
const myInProgressAssignments = computed(() =>
  myAssignments.value.filter(a => isInProgress((a as any).status))
);

const currentDate = ref(new Date());
const currentMonth = ref(currentDate.value.getMonth());
const currentYear = ref(currentDate.value.getFullYear());
const daysInMonth = computed(() =>
  new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
);

// Zaman dilimi sapmasını önlemek için yerel YYYY-MM-DD oluşturucu
const toLocalYMD = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Clean table: mevcut ayın 1..son günü
const tableStart = computed(
  () => new Date(currentYear.value, currentMonth.value, 1)
);
const tableEnd = computed(
  () => new Date(currentYear.value, currentMonth.value, daysInMonth.value)
);
const tableDayKeys = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const tableDays = computed(() => {
  const out: { iso: string; dow: string; dd: string }[] = [];
  const cur = new Date(tableStart.value);
  cur.setHours(0, 0, 0, 0);
  while (cur <= tableEnd.value) {
    const iso = toLocalYMD(cur);
    out.push({
      iso,
      dow: t(`days.${tableDayKeys[cur.getDay()]}`),
      dd: String(cur.getDate()).padStart(2, '0'),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
});

const taskRows = computed(() => {
  // Sadece kullanıcıya ait görevleri göster
  const source =
    myAssignments?.value && Array.isArray(myAssignments.value)
      ? myAssignments.value
      : assignments.value;
  return source.map(a => ({
    id: (a as any).id || (a as any).assignmentId,
    title:
      (a as any).assignmentName ||
      (a as any).name ||
      (a as any).title ||
      'Untitled',
    key: (a as any).key || String((a as any).id || (a as any).assignmentId),
    priority: (a as any).priority || 'Medium',
    status: (a as any).status,
  }));
});

const hoursAt = (taskId: number, iso: string): number | '' => {
  let sum = 0;
  for (const l of timeLogs.value as any[]) {
    const lIso = String(l.logDate || '').split('T')[0];
    if (l.assignmentId === taskId && lIso === iso) {
      const h =
        l.spentTimeInHours != null
          ? Number(l.spentTimeInHours)
          : Number(l.spentTimeInMinutes || 0) / 60;
      sum += isNaN(h) ? 0 : h;
    }
  }
  return sum || '';
};

const columnTotalHours = (iso: string): number | '' => {
  let sum = 0;
  for (const a of taskRows.value) {
    const v = hoursAt(a.id, iso);
    if (typeof v === 'number') sum += v;
  }
  return sum || '';
};

// Satır toplamı (tüm günler)
const rowTotalHours = (taskId: number): number | '' => {
  let sum = 0;
  for (const d of tableDays.value) {
    const v = hoursAt(taskId, d.iso);
    if (typeof v === 'number') sum += v;
  }
  return sum || '';
};

// Key sütunu alt toplam (tüm satır toplamlarının toplamı)
const keyColumnGrandTotal = (): number | '' => {
  let sum = 0;
  for (const t of taskRows.value) {
    const v = rowTotalHours(t.id);
    if (typeof v === 'number') sum += v;
  }
  return sum || '';
};

// Priority renkleri (homepage ile aynı mantıkta)
const priorityColor = (p: string): string => {
  const v = String(p || '').toLowerCase();
  if (v.includes('critical') || v.includes('urgent') || v.includes('highest'))
    return '#d32f2f'; // kırmızı
  if (v.includes('high')) return '#ef4444'; // canlı kırmızı
  if (v.includes('medium') || v.includes('normal')) return '#f59e0b'; // kehribar
  if (v.includes('low') || v.includes('lowest')) return '#10b981'; // yeşil
  return '#9aa0a6'; // gri varsayılan
};

const isLoggableIso = (iso: string): boolean => {
  if (!internStartDate.value || !internEndDate.value) return false;
  const d = new Date(iso);
  const s = new Date(internStartDate.value);
  const e = new Date(internEndDate.value);
  d.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
};

const openLogModalForCell = (taskId: number, iso: string) => {
  if (!isLoggableIso(iso)) return;
  // Görev durumu kontrolü: In Progress değilse izin verme
  const task = taskRows.value.find(t => t.id === taskId) as any;
  const fullAssignment = myAssignments.value.find(
    a => (a as any).id === taskId
  );
  const status = task?.status ?? (fullAssignment as any)?.status;
  if (!isInProgress(status)) {
    showNotification(
      'Bu görev tamamlandı veya aktif değil. Log girişi yapılamaz.',
      'error'
    );
    return;
  }
  modalAssignmentId.value = taskId;
  modalHours.value = 1;
  modalDate.value = iso; // iso zaten toLocalYMD ile üretildi
  showLogModal.value = true;
};

// ======================
// METOTLAR
// ======================

// Modal state
const showLogModal = ref(false);
const modalDate = ref<string>(''); // ISO YYYY-MM-DD
const modalHours = ref<number>(1);
const modalAssignmentId = ref<number | null>(null);

const getLoggedMinutes = (day: number): number => {
  if (!currentUserId.value || day === 0) return 0;

  const date = toLocalYMD(new Date(currentYear.value, currentMonth.value, day));

  const totalHours = (timeLogs.value as any[])
    .filter(log => String(log.logDate || '').split('T')[0] === date)
    .reduce(
      (sum, log) => sum + (Number((log as any).spentTimeInHours) || 0),
      0
    );
  return Math.round(totalHours * 60);
};

const saveLog = async () => {
  if (!currentUserId.value || !modalAssignmentId.value || !modalDate.value)
    return;
  try {
    await createTimeLog({
      spentTimeInHours: modalHours.value as any,
      logDate: modalDate.value,
      assignmentId: modalAssignmentId.value,
      internId: currentUserId.value,
    } as any);
    showLogModal.value = false;
    await fetchTimeLogs(currentUserId.value);
  } catch (err) {
    console.error('Log eklenirken hata oluştu:', err);
    showNotification('notifications.errorOccurred', 'error');
  }
};

// Görevleri yükle
const loadAssignments = async (internId: number) => {
  try {
    isLoading.value = true;
    error.value = null;

    // Backend filtrelerine güvenmeyelim; tümünü çekelim, client-side filtreleriz
    const response: any = await fetchAssignmentsPaged({
      internId,
      page: 0,
      size: 100,
      sort: 'assignedAt',
    });

    const list = Array.isArray(response?.content)
      ? response.content
      : Array.isArray(response)
      ? response
      : [];
    assignments.value = list;
  } catch (err) {
    console.error('Görevler çekilirken hata:', err);
    error.value = 'Görevler yüklenemedi.';
  } finally {
    isLoading.value = false;
  }
};

const fetchTimeLogs = async (internId: number) => {
  try {
    const logs = await getTimeLogsByIntern(internId);
    timeLogs.value = logs as any;
  } catch (err) {
    console.error('Loglar çekilirken hata oluştu:', err);
    showNotification('notifications.errorOccurred', 'error');
  }
};

// Ay değiştir
const changeMonth = (direction: number) => {
  currentMonth.value += direction;
  if (currentMonth.value < 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else if (currentMonth.value > 11) {
    currentMonth.value = 0;
    currentYear.value++;
  }
};

onMounted(async () => {
  try {
    const { accounts } = useMsal();
    const emailLocal = accounts.value[0]?.username || '';
    const res = await apiClient.get(
      `/api/interns/by-email?email=${encodeURIComponent(emailLocal)}`
    );
    const intern = res.data;

    if (intern?.id) {
      currentUserId.value = intern.id;
      internStartDate.value = intern.startDate;
      internEndDate.value = intern.endDate;

      await loadAssignments(intern.id);
      await fetchTimeLogs(intern.id);
    } else {
      error.value = 'Stajyer bilgisi alınamadı.';
    }
  } catch (err) {
    console.error(err);
    error.value = 'Kullanıcı bilgisi alınamadı.';
  }
});
</script>

<template>
  <div class="timesheet-container">
    <AppNotification
      :message="notificationMessage"
      :type="notificationType"
      :show="notificationShow"
      :duration="2200"
    />
    <h2>Timesheet Görünümü</h2>

    <div v-if="isLoading" class="state-message">Yükleniyor...</div>
    <div v-else-if="error" class="state-message error">{{ error }}</div>
    <div v-else>
      <div class="calendar-header">
        <button @click="changeMonth(-1)">◀</button>
        <span>{{ currentMonth + 1 }}/{{ currentYear }}</span>
        <button @click="changeMonth(1)">▶</button>
      </div>

      <!-- Clean Timesheet Table -->
      <div class="ts-card">
        <table class="ts-table">
          <thead>
            <tr class="ts-header-top">
              <th class="col-issue">{{ t('timesheet.issue') }}</th>
              <th class="col-key">{{ t('timesheet.key') }}</th>
              <th v-for="d in tableDays" :key="d.iso" class="col-day">
                {{ d.dow }}
              </th>
            </tr>
            <tr class="ts-header-bottom">
              <th class="col-issue"></th>
              <th class="col-key"></th>
              <th v-for="d in tableDays" :key="d.iso + '-n'" class="col-day">
                {{ d.dd }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in taskRows"
              :key="t.id"
              class="ts-row"
              :class="{ 'done-row': isCompleted(t.status) }"
            >
              <td class="col-issue col-left">
                <div class="issue-cell-content">
                  <span
                    class="prio-dot"
                    :style="{ background: priorityColor(t.priority) }"
                  ></span>
                  <strong class="issue-title">{{ t.title }}</strong>
                </div>
              </td>
              <td class="col-key">{{ rowTotalHours(t.id) }}</td>
              <td
                v-for="d in tableDays"
                :key="t.id + d.iso"
                class="col-day clickable"
                @click="openLogModalForCell(t.id, d.iso)"
                :title="
                  isLoggableIso(d.iso)
                    ? 'Log eklemek için tıklayın'
                    : 'Aralık dışında'
                "
              >
                <span class="val" v-if="hoursAt(t.id, d.iso)">{{
                  hoursAt(t.id, d.iso)
                }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="ts-total">
              <td class="col-issue col-left">{{ t('timesheet.total') }}</td>
              <td class="col-key">{{ keyColumnGrandTotal() }}</td>
              <td v-for="d in tableDays" :key="'tot-' + d.iso" class="col-day">
                <span class="val">{{ columnTotalHours(d.iso) }}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Mini Log Modal -->
      <div
        v-if="showLogModal"
        class="modal-overlay"
        @click.self="showLogModal = false"
      >
        <div class="mini-modal">
          <div class="mini-header">
            <span>Log Ekle</span>
            <button class="close" @click="showLogModal = false">×</button>
          </div>
          <div class="mini-body">
            <div class="field">
              <label>Tarih</label>
              <input type="date" v-model="modalDate" />
            </div>
            <div class="field">
              <label>Görev</label>
              <select v-model.number="modalAssignmentId">
                <option :value="null">Görev seçin</option>
                <option
                  v-for="a in myInProgressAssignments"
                  :key="a.id"
                  :value="a.id"
                >
                  {{ a.assignmentName || (a as any).name || (a as any).title }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>Saat</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                v-model.number="modalHours"
              />
            </div>
          </div>
          <div class="mini-actions">
            <button class="btn" @click="showLogModal = false">İptal</button>
            <button
              class="btn primary"
              @click="saveLog"
              :disabled="!modalAssignmentId"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timesheet-container {
  padding: 2rem;
  font-family: sans-serif;
  width: 100%;
  box-sizing: border-box;
}
h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}
.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.calendar-table {
  width: 100%;
  border-collapse: collapse;
}
.calendar-table th,
.calendar-table td {
  border: 1px solid #ddd;
  width: 14%;
  text-align: center;
  padding: 8px;
  vertical-align: top;
}

.state-message {
  padding: 2rem;
  text-align: center;
  background-color: #f9f9f9;
  border-radius: 8px;
  font-size: 1.2rem;
  color: #555;
  margin-top: 1rem;
}
.error {
  background-color: #ffebee;
  color: #ffffff;
}

/*Timesheet styles */
.ts-card {
  margin-bottom: 12px;
  overflow-x: auto;
}
.ts-table {
  width: 100%;
  border-collapse: collapse;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial,
    sans-serif;
  color: #202124;
}
.col-issue {
  width: 40%;
  text-align: left;
}
.col-key {
  width: 10%;
  text-align: center;
  min-width: 72px;
}
.col-day {
  text-align: center;
  min-width: 56px;
}
thead th {
  background: #242441;
  color: #ffffff;
  font-weight: 600;
  font-size: 16px;
  padding: 8px 6px;
}
.ts-header-top th {
  border-bottom: none;
}
.ts-header-bottom th {
  border-top: none;
  padding-top: 2px;
}
.ts-row td {
  font-size: 16px;
  padding: 14px 10px;
}
.ts-row:hover td {
  background: #fff;
}
.col-left {
  text-align: left;
}
.issue-title {
  font-weight: 700;
}
.ts-row {
  position: relative;
}
.ts-row.done-row::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: #242441;
  transform: translateY(-50%);
  pointer-events: none;
}
.issue-cell-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.prio-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  vertical-align: middle;
}
.val {
  font-size: 12px;
  color: #3c4043;
}
tfoot .ts-total td {
  background: #f7f8fa;
  font-weight: 700;
  padding: 8px 6px;
}
td,
th {
  border: 1px solid #eaeaea;
}
.clickable {
  cursor: pointer;
}

/* Mini modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.mini-modal {
  background: #fff;
  width: 320px;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  overflow: hidden;
}
.mini-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #242441;
  color: #fff;
  font-weight: 600;
}
.mini-header .close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}
.mini-body {
  padding: 10px;
  display: grid;
  gap: 8px;
}
.field label {
  display: block;
  font-size: 12px;
  margin-bottom: 4px;
  color: #555;
}
.field input,
.field select {
  width: 100%;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}
.mini-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 10px 10px;
}
.btn {
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  background: #f7f7f7;
  border-radius: 6px;
  cursor: pointer;
}
.btn.primary {
  background: #242441;
  color: #fff;
  border-color: #242441;
}
</style>
