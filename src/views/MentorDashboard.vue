<template>
  <div class="dashboard-grid">
    <DashboardCard
      :title="$t('mentorDashboard.assignmentStatus')"
      class="card-pie"
    >
      <PieChart :data="mentorStats" v-if="mentorStats.length" />
      <p v-else>{{ $t('mentorDashboard.noAssignment') }}</p>
    </DashboardCard>

    <DashboardCard title="" class="card-greeting">
      <div class="greeting-box">{{ greetingMessage }}</div>
    </DashboardCard>

    <DashboardCard :title="$t('mentorDashboard.assignments')" class="card-todo">
      <div class="assignment-table-scroll">
        <table class="assignment-table" v-if="assignments.length">
          <thead>
            <tr>
              <th>{{ $t('mentorDashboard.table.intern') }}</th>
              <th>{{ $t('mentorDashboard.table.task') }}</th>
              <th>{{ $t('mentorDashboard.table.priority') }}</th>
              <th>{{ $t('mentorDashboard.table.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in assignments" :key="a.id">
              <td>{{ a.internName }}</td>
              <td>{{ a.assignmentName }}</td>
              <td>
                <span
                  :class="['priority-dot', a.priority.toLowerCase()]"
                ></span>
                {{ $t('priorities.' + a.priority) }}
              </td>
              <td>{{ $t('statuses.' + a.status) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>{{ $t('mentorDashboard.noAssignments') }}</p>
      </div>
    </DashboardCard>

    <DashboardCard
      :title="$t('mentorDashboard.interns')"
      class="card-announcement"
    >
      <div class="intern-table-scroll">
        <table class="intern-table" v-if="interns.length">
          <thead>
            <tr>
              <th>{{ $t('mentorDashboard.table.name') }}</th>
              <th>{{ $t('mentorDashboard.table.email') }}</th>
              <th>{{ $t('mentorDashboard.table.university') }}</th>
              <th>{{ $t('mentorDashboard.table.department') }}</th>
              <th>{{ $t('mentorDashboard.table.startDate') }}</th>
              <th>{{ $t('mentorDashboard.table.endDate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="intern in interns" :key="intern.id">
              <td>{{ intern.name }} {{ intern.surname }}</td>
              <td>{{ intern.email }}</td>
              <td>{{ intern.university }}</td>
              <td>{{ intern.department }}</td>
              <td>{{ formatDate(intern.startDate) }}</td>
              <td>{{ formatDate(intern.endDate) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else>{{ $t('mentorDashboard.noInterns') }}</p>
      </div>
    </DashboardCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMsal } from 'vue3-msal-plugin';
import DashboardCard from '@/components/DashboardCard.vue';
import PieChart from '@/components/PieChart.vue';
import apiClient from '@/utils/apiClients';

interface Intern {
  id: number;
  name: string;
  surname: string;
  email: string;
  university: string;
  department: string;
  startDate: string;
  endDate: string;
}

interface Assignment {
  id: number;
  assignmentName: string;
  priority: string;
  status: string;
  internName: string;
}

const { accounts } = useMsal();
const { t, locale } = useI18n();
const email = accounts.value[0].username;

const greetingMessage = ref('');
const mentorStats = ref<{ name: string; value: number }[]>([]);
const mentorId = ref<number | null>(null);
const mentorName = ref('');
const interns = ref<Intern[]>([]);
const assignments = ref<Assignment[]>([]);

const updateAssignmentStats = async () => {
  try {
    const res = await apiClient.get(
      `/api/assignments/stats/mentor?email=${email}`
    );
    mentorStats.value = Object.entries(res.data).map(([name, value]) => ({
      name,
      value: value as number,
    }));
  } catch (err) {
    console.error('Failed to load mentor stats:', err);
  }
};

const updateGreeting = async () => {
  const hour = new Date().getHours();
  const baseGreeting =
    hour < 12
      ? 'greetings.morning'
      : hour < 18
      ? 'greetings.afternoon'
      : 'greetings.evening';

  try {
    const mentorRes = await apiClient.get(`/api/mentors/email/${email}`);
    mentorName.value = mentorRes.data.name;
    mentorId.value = mentorRes.data.id;

    greetingMessage.value = `${t(baseGreeting)}, ${mentorName.value}! ${
      hour < 18 ? '🌤️' : '🌙'
    }`;
  } catch (err) {
    greetingMessage.value = `${t(baseGreeting)}! 🌤️`;
  }
};

watch(locale, () => {
  updateAssignmentStats();
  updateGreeting();
});

watch(mentorId, async newId => {
  if (newId !== null) {
    try {
      const internsRes = await apiClient.get(`/api/interns/mentor/${newId}`);
      interns.value = internsRes.data;

      const assignmentsRes = await apiClient.get(
        `/api/assignments/by-mentor/${newId}`
      );
      assignments.value = assignmentsRes.data;
    } catch (err) {
      console.error('Mentora bağlı veriler alınamadı:', err);
    }
  }
});

onMounted(async () => {
  updateGreeting();
  updateAssignmentStats();

  try {
    if (mentorId.value !== null) {
      const internsRes = await apiClient.get(
        `/api/interns/mentor/${mentorId.value}`
      );
      interns.value = internsRes.data;

      const assignmentsRes = await apiClient.get(
        `/api/assignments/by-mentor/${mentorId.value}`
      );
      assignments.value = assignmentsRes.data;
    }
  } catch (err) {
    console.error('Failed to load mentor data:', err);
  }
});

const formatDate = (date: string) => new Date(date).toLocaleDateString('tr-TR');
</script>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    'pie greeting'
    'pie announcement'
    'todo todo';
  gap: 12px;
  padding: 12px;
  max-width: 1100px;
  margin: auto;
  box-sizing: border-box;
}

.card-pie {
  grid-area: pie;
}
.card-greeting {
  grid-area: greeting;
}
.card-announcement {
  grid-area: announcement;
}
.card-todo {
  grid-area: todo;
}

.greeting-box {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.assignment-table-scroll {
  overflow-y: auto;
  max-height: 170px;
  border-top: 1px solid #eee;
  margin-top: 10px;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}
.assignment-table-scroll::-webkit-scrollbar {
  width: 6px;
}
.assignment-table-scroll::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
}

.assignment-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.assignment-table th,
.assignment-table td {
  padding: 10px;
  font-size: 13px;
  border-bottom: 1px solid #ddd;
  text-align: left;
  vertical-align: top;
}

.assignment-table td:nth-child(1),
.assignment-table td:nth-child(3),
.assignment-table td:nth-child(4),
.assignment-table th:nth-child(1),
.assignment-table th:nth-child(3),
.assignment-table th:nth-child(4) {
  width: 120px;
}

.assignment-table td:nth-child(2) {
  max-width: 200px;
  white-space: normal;
  word-break: break-word;
}

.intern-table-scroll {
  max-height: 170px;
  min-height: 170px;
  overflow-y: auto;
  border-top: 1px solid #eee;
  margin-top: 10px;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 transparent;
}
.intern-table-scroll::-webkit-scrollbar {
  width: 6px;
}
.intern-table-scroll::-webkit-scrollbar-thumb {
  background-color: #c1c1c1;
  border-radius: 4px;
}

.intern-table {
  width: 100%;
  border-collapse: collapse;
}
.intern-table th,
.intern-table td {
  padding: 8px;
  font-size: 12px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

.priority-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: middle;
}
.priority-dot.urgent {
  background-color: red;
}
.priority-dot.high {
  background-color: orange;
}
.priority-dot.medium {
  background-color: gold;
}
.priority-dot.low {
  background-color: green;
}
.priority-dot.optional {
  background-color: lightgray;
}
.priority-dot.normal {
  background-color: #5c6bc0;
}
</style>
