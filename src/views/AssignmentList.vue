<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import {
  fetchAssignmentsPaged,
  updateAssignment,
  type Assignment,
} from '@/utils/assignmentService';
import { useMsal } from 'vue3-msal-plugin';
import { useI18n } from 'vue-i18n';
import { formatDate } from '@/utils/formatters';
import apiClient from '@/utils/apiClients';

const assignments = ref<Assignment[]>([]);
const totalPages = ref(0);
const isLoading = ref(true);
const error = ref<string | null>(null);
const currentUserId = ref<number | null>(null);

// Benim görevlerim için değişkenler
const myAssignments = ref<Assignment[]>([]);
const isLoadingMy = ref(true);

const { accounts } = useMsal();
const { t } = useI18n();
const email = accounts.value[0].username;

const currentPage = ref(0);
const filters = reactive({
  status: '',
  sort: 'assignedAt',
  size: 5,
});

const statusOptions = ['To Do', 'In Progress', 'Completed'];
const sortOptions = [
  { label: 'Atanma Tarihi', value: 'assignedAt' },
  { label: 'Bitiş Tarihi', value: 'dueDate' },
];

// Modal kontrolü
const showModal = ref(false);
const selectedAssignment = ref<Assignment | null>(null);
const previousStatus = ref<string>('');

// Güvenlik kontrolü - sadece kendi görevini güncelleyebilir
const canEdit = (assignment: Assignment) => {
  return assignment.internId === currentUserId.value;
};

// Modal üzerinden onaylama akışı
const handleStatusChange = (assignment: Assignment) => {
  if (!canEdit(assignment)) {
    alert('Bu görevi güncelleyemezsiniz!');
    return;
  }

  // Eğer görev zaten tamamlanmışsa değiştirilemez
  if (previousStatus.value === 'Completed') {
    alert('Tamamlanmış görevler değiştirilemez!');
    assignment.status = previousStatus.value; // Eski duruma geri dön
    return;
  }

  // Eğer statüsü değiştiriyorsa modal göster
  selectedAssignment.value = assignment;
  showModal.value = true;
};

const updateStatusDirectly = async (assignment: Assignment) => {
  if (!assignment.id) return;
  try {
    await updateAssignment(assignment.id, { status: assignment.status });
    window.location.reload(); // ✅ PieChart + Dashboard assignment'ları tekrar çeker
  } catch (err) {
    console.error('Statü güncellenirken hata:', err);
    alert('Statü güncellenemedi.');
  }
};

const confirmCompletion = () => {
  if (selectedAssignment.value) {
    updateStatusDirectly(selectedAssignment.value);
    selectedAssignment.value = null;
    showModal.value = false;
  }
};

const cancelCompletion = () => {
  if (selectedAssignment.value) {
    selectedAssignment.value.status = previousStatus.value;
    selectedAssignment.value = null;
    showModal.value = false;
  }
};

const loadMyAssignments = async () => {
  if (!currentUserId.value) {
    console.log('currentUserId henüz yüklenmedi');
    return;
  }

  try {
    isLoadingMy.value = true;

    // Tüm görevlerden sadece benim olanları filtrele
    const filteredAssignments = assignments.value.filter(
      assignment => assignment.internId === currentUserId.value
    );

    // Status filtresi varsa uygula
    let finalAssignments = filteredAssignments;
    if (filters.status) {
      finalAssignments = filteredAssignments.filter(
        assignment => assignment.status === filters.status
      );
    }

    myAssignments.value = finalAssignments;
    console.log('Tüm görevler:', assignments.value.length);
    console.log('Benim görevlerim (filtrelenmiş):', myAssignments.value.length);
    console.log('currentUserId:', currentUserId.value);
  } catch (err) {
    console.error('Benim görevlerim yüklenemedi:', err);
  } finally {
    isLoadingMy.value = false;
  }
};

const loadAssignments = async (internId: number) => {
  try {
    isLoading.value = true;
    error.value = null;

    const response = await fetchAssignmentsPaged({
      internId,
      page: currentPage.value,
      size: filters.size,
      sort: filters.sort,
      status: filters.status,
    });

    assignments.value = response.content;
    totalPages.value = response.totalPages;
  } catch (err) {
    console.error('Görevler çekilirken hata:', err);
    error.value = 'Görevler yüklenemedi.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    console.log('onMounted başladı, email:', email);
    const res = await apiClient.get(`/api/interns/by-email?email=${email}`);
    const internId = res.data?.id;
    console.log('API yanıtı:', res.data);
    console.log('Bulunan internId:', internId);

    if (internId) {
      currentUserId.value = internId;
      console.log('currentUserId set edildi:', currentUserId.value);
      await loadAssignments(internId);
      // Tüm görevler yüklendikten sonra benim görevlerimi filtrele
      loadMyAssignments();

      watch(
        [
          () => currentPage.value,
          () => filters.status,
          () => filters.sort,
          () => filters.size,
        ],
        async () => {
          await loadAssignments(internId);
          loadMyAssignments(); // Tüm görevler yeniden yüklendikten sonra benim görevlerimi filtrele
        }
      );

      // myCurrentPage artık yok, gerekirse ekleyebiliriz
    } else {
      error.value = 'Stajyer bilgisi alınamadı.';
    }
  } catch (err) {
    error.value = 'Kullanıcı bilgisi alınamadı.';
  }
});
</script>

<template>
  <div class="assignment-container">
    <!-- BİRİNCİ TABLO: Benim Görevlerim -->
    <div class="my-assignments-section">
      <h2>{{ $t('assignmentList.myAssignments') }}</h2>

      <div class="filter-bar">
        <select v-model="filters.status">
          <option value="">{{ $t('assignmentList.statusAll') }}</option>
          <option v-for="s in statusOptions" :key="s" :value="s">
            {{ $t(`statuses.${s}`) }}
          </option>
        </select>

        <select v-model="filters.sort">
          <option v-for="o in sortOptions" :key="o.value" :value="o.value">
            {{ $t(`assignmentList.sortOptions.${o.value}`) }}
          </option>
        </select>

        <select v-model="filters.size">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="15">15</option>
        </select>
      </div>

      <div v-if="isLoadingMy" class="state-message">
        {{ $t('assignmentList.myAssignmentsLoading') }}
      </div>
      <div v-else-if="myAssignments.length === 0" class="state-message">
        {{ $t('assignmentList.myAssignmentsEmpty') }}
      </div>

      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{{ $t('assignmentList.table.name') }}</th>
              <th>{{ $t('assignmentList.table.desc') }}</th>
              <th>{{ $t('assignmentList.table.assigned') }}</th>
              <th>{{ $t('assignmentList.table.due') }}</th>
              <th>{{ $t('assignmentList.table.priority') }}</th>
              <th>{{ $t('assignmentList.table.mentor') }}</th>
              <th>{{ $t('assignmentList.table.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in myAssignments"
              :key="item.id"
              class="my-task-row"
            >
              <td>{{ item.assignmentName }}</td>
              <td>{{ item.assignmentDesc }}</td>
              <td>{{ formatDate(item.assignedAt) }}</td>
              <td>{{ formatDate(item.dueDate) }}</td>
              <td>{{ $t(`priorities.${item.priority}`) }}</td>
              <td>{{ item.mentorName }}</td>
              <td>
                <select
                  v-model="item.status"
                  @focus="previousStatus = item.status || ''"
                  @change="handleStatusChange(item)"
                  :disabled="!canEdit(item) || item.status === 'Completed'"
                  :title="
                    !canEdit(item)
                      ? 'Bu görevi güncelleyemezsiniz'
                      : item.status === 'Completed'
                      ? 'Tamamlanmış görevler değiştirilemez'
                      : ''
                  "
                  :class="{
                    'disabled-select':
                      !canEdit(item) || item.status === 'Completed',
                  }"
                >
                  <option v-for="s in statusOptions" :key="s" :value="s">
                    {{ $t(`statuses.${s}`) }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- AYIRICI -->
    <div class="section-divider"></div>

    <!-- İKİNCİ TABLO: Tüm Görevler -->
    <div class="all-assignments-section">
      <h2>{{ $t('assignmentList.allAssignments') }}</h2>

      <div v-if="isLoading" class="state-message">
        {{ $t('assignmentList.loading') }}
      </div>
      <div v-else-if="error" class="state-message error">
        {{ $t('assignmentList.loadError') }}
      </div>

      <div v-else>
        <div v-if="assignments.length === 0" class="state-message">
          {{ $t('assignmentList.noAssignments') }}
        </div>

        <div class="table-scroll" v-else>
          <table>
            <thead>
              <tr>
                <th>{{ $t('assignmentList.table.name') }}</th>
                <th>{{ $t('assignmentList.table.desc') }}</th>
                <th>{{ $t('assignmentList.table.assigned') }}</th>
                <th>{{ $t('assignmentList.table.due') }}</th>
                <th>{{ $t('assignmentList.table.priority') }}</th>
                <th>{{ $t('assignmentList.table.mentor') }}</th>
                <th>Stajyer</th>
                <th>{{ $t('assignmentList.table.status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in assignments"
                :key="item.id"
                :class="{
                  'my-task-row': item.internId === currentUserId,
                  'other-task-row': item.internId !== currentUserId,
                }"
              >
                <td>{{ item.assignmentName }}</td>
                <td>{{ item.assignmentDesc }}</td>
                <td>{{ formatDate(item.assignedAt) }}</td>
                <td>{{ formatDate(item.dueDate) }}</td>
                <td>{{ $t(`priorities.${item.priority}`) }}</td>
                <td>{{ item.mentorName }}</td>
                <td>{{ item.internName }}</td>
                <td>
                  <select
                    v-model="item.status"
                    @focus="previousStatus = item.status || ''"
                    @change="handleStatusChange(item)"
                    :disabled="!canEdit(item) || item.status === 'Completed'"
                    :title="
                      !canEdit(item)
                        ? 'Bu görevi güncelleyemezsiniz'
                        : item.status === 'Completed'
                        ? 'Tamamlanmış görevler değiştirilemez'
                        : ''
                    "
                    :class="{
                      'disabled-select':
                        !canEdit(item) || item.status === 'Completed',
                    }"
                  >
                    <option v-for="s in statusOptions" :key="s" :value="s">
                      {{ $t(`statuses.${s}`) }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button @click="currentPage--" :disabled="currentPage === 0">
            ◀
          </button>
          <span>
            {{ $t('assignmentList.page') }} {{ currentPage + 1 }} /
            {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage + 1 >= totalPages"
          >
            ▶
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <p>
          {{
            $t('assignmentList.confirmStatusChange', {
              newStatus: $t(`statuses.${selectedAssignment?.status}`),
            })
          }}
        </p>
        <div class="modal-buttons">
          <button @click="confirmCompletion">{{ $t('buttons.yes') }}</button>
          <button @click="cancelCompletion">{{ $t('buttons.no') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assignment-container {
  padding: 2rem;
  font-family: sans-serif;
  width: 100%;
  box-sizing: border-box;
}
h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}
.filter-bar select {
  padding: 6px;
}
.table-scroll {
  max-height: 1500px;
  overflow-y: auto;
  border: 1px solid #ddd;
}
table {
  width: 100%;
  border-collapse: collapse;
}
thead {
  background-color: #242441;
  color: white;
}
th,
td {
  padding: 5px 10px;
  border: 1px solid #ddd;
  text-align: left;
}
tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}
tbody tr:hover {
  background-color: #e9ecef;
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
  color: #c62828;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 400px;
  width: 100%;
}
.modal-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}
.modal-buttons button {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.modal-buttons button:first-child {
  background-color: #242441;
  color: white;
}
.modal-buttons button:last-child {
  background-color: #e0e0e0;
}

.disabled-select {
  background-color: #f8f9fa !important;
  color: #6c757d !important;
  cursor: not-allowed !important;
}

.section-divider {
  height: 2px;
  background: linear-gradient(to right, #242441, #6c757d, #242441);
  margin: 2rem 0;
  border-radius: 2px;
}

.my-assignments-section h2 {
  color: #242441;
  border-left: 4px solid #242441;
  padding-left: 1rem;
}

.all-assignments-section h2 {
  color: #6c757d;
  border-left: 4px solid #6c757d;
  padding-left: 1rem;
}
</style>
