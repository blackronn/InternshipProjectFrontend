<template>
  <div class="mentor-timesheet-container">
    <AppNotification
      :message="notificationMessage"
      :type="notificationType"
      :show="notificationShow"
      :duration="2200"
    />

    <div class="header-section">
      <h2>{{ $t('mentorTimesheet.title') }}</h2>
    </div>

    <!-- Stajyer Seçimi -->
    <div class="intern-selector">
      <label for="internSelect">{{ $t('mentorTimesheet.selectIntern') }}</label>
      <select
        id="internSelect"
        v-model="selectedInternId"
        @change="onInternChange"
        :disabled="isLoadingInterns"
      >
        <option value="">{{ $t('mentorTimesheet.chooseIntern') }}</option>
        <option v-for="intern in interns" :key="intern.id" :value="intern.id">
          {{ intern.name }} {{ intern.surname }} - {{ intern.university }}
        </option>
      </select>
    </div>

    <!-- Yükleme Durumu -->
    <div v-if="isLoadingInterns" class="loading-state">
      <div class="spinner"></div>
      <p>{{ $t('mentorTimesheet.loadingInterns') }}</p>
    </div>

    <!-- Seçili Stajyer Yok -->
    <div v-else-if="!selectedInternId" class="empty-state">
      <p>{{ $t('mentorTimesheet.selectInternToView') }}</p>
    </div>

    <!-- Stajyer Seçildi - Sade Görünüm -->
    <div v-else-if="selectedIntern" class="simple-view">
      <!-- Üst çubuk: stajyer kısa bilgi + tarih aralığı + toplam saat -->
      <div class="top-bar">
        <div class="intern-brief">
          <div class="avatar">
            {{ getInitials(selectedIntern.name, selectedIntern.surname) }}
          </div>
          <div class="meta">
            <div class="name">
              {{ selectedIntern.name }} {{ selectedIntern.surname }}
            </div>
            <div class="sub">
              {{ selectedIntern.university }} • {{ selectedIntern.department }}
            </div>
          </div>
        </div>

        <div class="range-refresh">
          <div class="range">
            <input
              type="date"
              v-model="dateRange.start"
              @change="onDateRangeChange"
            />
            <span>—</span>
            <input
              type="date"
              v-model="dateRange.end"
              @change="onDateRangeChange"
            />
          </div>
          <div class="action-buttons">
            <button class="btn" @click="refreshData" :disabled="isLoadingData">
              <span v-if="isLoadingData" class="spinner-small"></span
              >{{ $t('mentorTimesheet.refresh') }}
            </button>
            <button
              class="btn btn-export"
              @click="exportTableToCSV"
              :disabled="!timeLogs.length"
            >
              {{ $t('mentorTimesheet.exportTable') }}
            </button>
            <button
              class="btn btn-export"
              @click="exportLogsToCSV"
              :disabled="!timeLogs.length"
            >
              {{ $t('mentorTimesheet.exportLogs') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="isLoadingData" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('mentorTimesheet.loadingData') }}</p>
      </div>

      <div v-else-if="timeLogs.length > 0" class="content-card">
        <div class="totals">
          <div class="total-item">
            <span class="label">{{ $t('mentorTimesheet.totalHours') }}</span>
            <span class="value">{{ totalHours.toFixed(1) }}h</span>
          </div>
          <div class="total-item" v-if="activeTasksCount">
            <span class="label">{{ $t('mentorTimesheet.activeTasks') }}</span>
            <span class="value">{{ activeTasksCount }}</span>
          </div>
        </div>

        <!-- Gün-Görev bazlı stacked bar chart -->
        <div class="chart-wrapper">
          <canvas ref="stackedCanvas"></canvas>
        </div>

        <div class="table-wrapper">
          <table class="compact-table">
            <thead>
              <tr>
                <th>{{ $t('mentorTimesheet.taskName') }}</th>
                <th class="align-center">{{ $t('mentorTimesheet.status') }}</th>
                <th class="align-right">
                  {{ $t('mentorTimesheet.totalHours') }}
                </th>
                <th class="align-right">
                  {{ $t('mentorTimesheet.lastActivity') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in taskSummary" :key="task.id">
                <td class="task-name">
                  <span
                    class="prio-dot"
                    :style="{ background: priorityColor(task.priority) }"
                  ></span>
                  {{ task.name }}
                </td>
                <td class="align-center">
                  <span class="badge">{{ $t('statuses.' + task.status) }}</span>
                </td>
                <td class="align-right">{{ task.totalHours.toFixed(1) }}h</td>
                <td class="align-right">{{ formatDate(task.lastActivity) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="empty-data-state">
        <div class="empty-icon">📝</div>
        <p>{{ $t('mentorTimesheet.noDataFound') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  watch,
  nextTick,
  onBeforeUnmount,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useMsal } from 'vue3-msal-plugin';
import AppNotification from '@/components/AppNotification.vue';
import apiClient from '@/utils/apiClients';
import { getTimeLogsByDateRange } from '@/utils/timelogService';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';

const { t } = useI18n();
const { accounts } = useMsal();
const email = accounts.value[0]?.username || '';

// State
const interns = ref<any[]>([]);
const selectedInternId = ref<string>('');
const selectedIntern = ref<any>(null);
const timeLogs = ref<any[]>([]);
const assignments = ref<any[]>([]);
const isLoadingInterns = ref(false);
const isLoadingData = ref(false);

// Bildirim durumu
const notificationMessage = ref('');
const notificationType = ref<'success' | 'error' | 'info'>('info');
const notificationShow = ref(false);

// Tarih aralığı
const dateRange = ref({
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0], // 30 gün önce
  end: new Date().toISOString().split('T')[0], // Bugün
});
// Chart setup
Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
);
const stackedCanvas = ref<HTMLCanvasElement | null>(null);
let stackedChart: Chart | null = null;

const priorityColor = (p: string): string => {
  const v = String(p || '').toLowerCase();
  if (v.includes('critical') || v.includes('urgent') || v.includes('highest'))
    return '#d32f2f';
  if (v.includes('high')) return '#ef4444';
  if (v.includes('medium') || v.includes('normal')) return '#f59e0b';
  if (v.includes('low') || v.includes('lowest')) return '#10b981';
  return '#9aa0a6';
};

const chartDays = computed(() => {
  const days = new Set<string>();
  timeLogs.value.forEach(l => {
    const d = String(l.logDate || '').split('T')[0];
    if (d) days.add(d);
  });
  return Array.from(days).sort();
});

const chartTasks = computed(() => {
  const ids = new Set<number>();
  timeLogs.value.forEach(l => ids.add(l.assignmentId));
  return assignments.value.filter(a => ids.has(a.id));
});

const buildStackedData = () => {
  const labels = chartDays.value;
  const datasets = chartTasks.value.map(task => {
    const data = labels.map(d => {
      return timeLogs.value
        .filter(
          l =>
            l.assignmentId === task.id &&
            String(l.logDate || '').split('T')[0] === d
        )
        .reduce((s, l) => s + (l.spentTimeInHours || 0), 0);
    });
    return {
      label: task.assignmentName || task.name || task.title,
      data,
      backgroundColor: priorityColor(task.priority || 'Medium'),
      stack: 'hours',
    } as any;
  });
  return { labels, datasets };
};

const renderStackedChart = () => {
  if (!stackedCanvas.value) return;
  const ctx = stackedCanvas.value.getContext('2d');
  if (!ctx) return;
  const { labels, datasets } = buildStackedData();
  if (stackedChart) stackedChart.destroy();
  stackedChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
      scales: {
        x: { stacked: true },
        y: { stacked: true, title: { display: true, text: 'Saat' } },
      },
    },
  });
};

// Computed
const totalHours = computed(() => {
  return timeLogs.value.reduce(
    (sum, log) => sum + (log.spentTimeInHours || 0),
    0
  );
});

const activeTasksCount = computed(() => {
  return assignments.value.filter(
    assignment =>
      assignment.status === 'In Progress' ||
      assignment.status === 'Devam Ediyor'
  ).length;
});

const taskSummary = computed(() => {
  const taskMap = new Map();

  timeLogs.value.forEach(log => {
    const task = assignments.value.find(a => a.id === log.assignmentId);
    if (!task) return;

    if (!taskMap.has(task.id)) {
      taskMap.set(task.id, {
        id: task.id,
        name: task.assignmentName || task.name || task.title,
        priority: task.priority || 'Medium',
        status: task.status || 'Unknown',
        totalHours: 0,
        workingDays: new Set(),
        lastActivity: '' as string | null,
      });
    }

    const summary = taskMap.get(task.id);
    summary.totalHours += log.spentTimeInHours || 0;
    // Çalışılan gün: logDate bazlı (iş günü)
    const workDay = String(log.logDate || '').split('T')[0];
    if (workDay) summary.workingDays.add(workDay);
    // Son aktivite: sadece logDate (gün bazında)
    const activityDay = String(log.logDate || '').split('T')[0];
    if (activityDay) {
      if (!summary.lastActivity || activityDay > summary.lastActivity) {
        summary.lastActivity = activityDay;
      }
    }
  });

  return Array.from(taskMap.values()).map(summary => ({
    ...summary,
    // çalışılan gün/ortalama kaldırıldı
  }));
});

// Methods
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

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('tr-TR');
};

const getTaskName = (assignmentId: number) => {
  const assignment = assignments.value.find(a => a.id === assignmentId);
  return assignment
    ? assignment.assignmentName || assignment.name || assignment.title
    : 'Bilinmeyen Görev';
};

const onInternChange = () => {
  if (selectedInternId.value) {
    selectedIntern.value = interns.value.find(
      i => i.id == selectedInternId.value
    );
    loadInternData();
  } else {
    selectedIntern.value = null;
    timeLogs.value = [];
    assignments.value = [];
  }
};

const onDateRangeChange = async () => {
  if (selectedInternId.value) {
    await loadInternData();
  }
};

const loadInterns = async () => {
  try {
    isLoadingInterns.value = true;
    const mentorRes = await apiClient.get(
      `/api/mentors/email/${encodeURIComponent(email)}`
    );
    const mentorId = mentorRes.data.id;

    // eslint-disable-next-line no-undef
    const internsRes = await apiClient.get<Intern[]>(
      `/api/interns/mentor/${mentorId}`
    );
    interns.value = internsRes.data;
  } catch (err) {
    console.error('Stajyerler yüklenemedi:', err);
    showNotification('mentorTimesheet.loadError', 'error');
  } finally {
    isLoadingInterns.value = false;
  }
};

const loadInternData = async () => {
  if (!selectedInternId.value) return;

  try {
    isLoadingData.value = true;

    // Mentor ID'yi al
    const mentorRes = await apiClient.get(
      `/api/mentors/email/${encodeURIComponent(email)}`
    );
    const mentorId = mentorRes.data.id;

    // Görevleri yükle
    const assignmentsRes = await apiClient.get(
      `/api/assignments/by-mentor/${mentorId}`
    );
    assignments.value = assignmentsRes.data;

    // Tarih aralığını backend'in beklediği kapsayıcı (inclusive) sınırlar ile biçimlendir
    const startRaw = dateRange.value.start;
    const endRaw = dateRange.value.end;
    if (startRaw && endRaw && new Date(startRaw) > new Date(endRaw)) {
      // Ters girişte otomatik düzeltme
      const tmp = dateRange.value.start;
      dateRange.value.start = endRaw;
      dateRange.value.end = tmp;
    }
    const startParam = dateRange.value.start
      ? `${dateRange.value.start}T00:00:00`
      : '';
    const endParam = dateRange.value.end
      ? `${dateRange.value.end}T23:59:59`
      : '';

    // Zaman loglarını (tarih aralığı) yükle
    const logs = await getTimeLogsByDateRange(
      Number(selectedInternId.value),
      startParam,
      endParam
    );
    timeLogs.value = logs as any[];
  } catch (err) {
    console.error('Stajyer verileri yüklenemedi:', err);
    showNotification('mentorTimesheet.dataLoadError', 'error');
  } finally {
    isLoadingData.value = false;
    // Canvas v-if altında; görünür olduktan sonra çiz
    await nextTick();
    if (timeLogs.value.length) {
      renderStackedChart();
    } else if (stackedChart) {
      stackedChart.destroy();
      stackedChart = null;
    }
  }
};

const refreshData = () => {
  loadInternData();
};

// CSV Export Functions
const exportTableToCSV = () => {
  if (!selectedIntern.value || !taskSummary.value.length) {
    showNotification('mentorTimesheet.noDataToExport', 'info');
    return;
  }

  const headers = ['Görev Adı', 'Durum', 'Toplam Saat', 'Son Aktivite'];

  const csvData = taskSummary.value.map(task => [
    task.name,
    task.status,
    `${task.totalHours.toFixed(1)}h`,
    formatDate(task.lastActivity),
  ]);

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadCSV(
    csvContent,
    `gorev-ozeti-${selectedIntern.value.name}-${selectedIntern.value.surname}-${
      new Date().toISOString().split('T')[0]
    }.csv`
  );

  showNotification('mentorTimesheet.tableExported', 'success');
};

const exportLogsToCSV = () => {
  if (!selectedIntern.value || !timeLogs.value.length) {
    showNotification('mentorTimesheet.noDataToExport', 'info');
    return;
  }

  const headers = ['Tarih', 'Görev Adı', 'Açıklama', 'Harcanan Saat', 'Durum'];

  const csvData = timeLogs.value.map(log => {
    const task = assignments.value.find(a => a.id === log.assignmentId);
    const taskName = task
      ? task.assignmentName || task.name || task.title
      : 'Bilinmeyen Görev';

    return [
      formatDate(log.logDate),
      taskName,
      log.description || '',
      `${log.spentTimeInHours || 0}h`,
      task?.status || 'Bilinmeyen',
    ];
  });

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  downloadCSV(
    csvContent,
    `zaman-loglari-${selectedIntern.value.name}-${
      selectedIntern.value.surname
    }-${new Date().toISOString().split('T')[0]}.csv`
  );

  showNotification('mentorTimesheet.logsExported', 'success');
};

const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Lifecycle
onMounted(() => {
  loadInterns();
  // responsive re-render on window resize (optional)
  window.addEventListener('resize', renderStackedChart);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', renderStackedChart);
});

// Watchers
watch(selectedInternId, newId => {
  if (newId) {
    onInternChange();
  }
});

// Veri seti değiştiğinde grafiği tazele
watch([timeLogs, assignments], () => {
  // timeLogs boşsa grafiği sil
  if (!timeLogs.value.length) {
    if (stackedChart) {
      stackedChart.destroy();
      stackedChart = null;
    }
    return;
  }
  renderStackedChart();
});
</script>

<style scoped>
.mentor-timesheet-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  text-align: center;
  margin-bottom: 2rem;
}

.header-section h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.header-section p {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.intern-selector {
  margin-bottom: 2rem;
  text-align: center;
}

.intern-selector label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #34495e;
}

.intern-selector select {
  padding: 0.75rem 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 300px;
  background: white;
  cursor: pointer;
}

.intern-selector select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.loading-state,
.empty-state,
.empty-data-state {
  text-align: center;
  padding: 16px;
  color: #555;
}

.spinner {
  width: 12px;
  height: 12px;
  background: #bbb;
  display: inline-block;
  margin-right: 6px;
}

.spinner-small {
  width: 10px;
  height: 10px;
  background: #bbb;
  display: inline-block;
  margin-right: 6px;
}

/* no animations */

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

/* Top bar */
.top-bar {
  background: #fff;
  border: 1px solid #ddd;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}

.intern-brief {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #666;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
}

.meta .name {
  font-weight: 600;
  color: #222;
}

.meta .sub {
  color: #666;
  font-size: 12px;
}

.range-refresh {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range {
  display: flex;
  align-items: center;
  gap: 6px;
}

.range input {
  padding: 4px 6px;
  border: 1px solid #ccc;
}

.btn {
  padding: 6px 10px;
  background: #242441;
  color: #fff;
  border: 1px solid #333;
  cursor: pointer;
  font-size: 12px;
}

.btn-export {
  background: #27ae60;
  border-color: #229954;
  /* yazı taşıyor onu düzelt */
  overflow: hidden;
  width: 100px;
  height: 40px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-export:hover {
  background: #229954;
}

.btn:disabled {
  background: #bdc3c7;
  border-color: #95a5a6;
  cursor: not-allowed;
}

/* content */
.content-card {
  background: #fff;
  border: 1px solid #ddd;
  padding: 8px;
}

.totals {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.total-item {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 6px 8px;
}

.total-item .label {
  color: #555;
  font-size: 12px;
}

.total-item .value {
  font-weight: 600;
  color: #222;
  margin-left: 6px;
}

.table-wrapper {
  overflow-x: auto;
}

.chart-wrapper {
  margin: 10px 0 14px;
}

.prio-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  vertical-align: middle;
  margin-right: 6px;
}

.compact-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.compact-table th {
  text-align: left;
  background: #242441;
  border: 1px solid #ddd;
  color: #ffffff;
  padding: 10px;
  font-size: 16px;
}

.compact-table td {
  border: 1px solid #ddd;
  color: #222;
  padding: 12px;
}

.task-name {
  font-size: 15px;
}

.align-right {
  text-align: right;
  font-size: 15px;
}

.align-center {
  text-align: center;
}

.badge {
  background: #e0e0e0;
  color: #222;
  padding: 2px 6px;
  font-size: 15px;
}

@media (max-width: 768px) {
  .mentor-timesheet-container {
    padding: 1rem;
  }
}
</style>
