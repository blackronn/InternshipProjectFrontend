<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { addAssignment } from '@/utils/assignmentService';
import { useMsal } from 'vue3-msal-plugin';
import AppNotification from '@/components/AppNotification.vue';
import { formatDate } from '@/utils/formatters';
import apiClient from '@/utils/apiClients';
import { getAccessToken } from '@/utils/msalHelpers';

const interns = ref<{ id: number; name: string }[]>([]);
const currentMentor = ref<{ id: number; name: string } | null>(null);
const router = useRouter();
const { accounts } = useMsal();
const email = accounts.value[0].username;

const notificationMessage = ref('');
const notificationType = ref<'success' | 'error' | 'info'>('info');
const notificationShow = ref(false);

function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) {
  notificationShow.value = false;
  notificationMessage.value = message;
  notificationType.value = type;
  setTimeout(() => {
    notificationShow.value = true;
  }, 10);
}

const priorityOptions = ['Urgent', 'High', 'Medium', 'Low', 'Optional'];
const today = new Date().toISOString().split('T')[0];

const form = ref({
  internId: 0,
  mentorId: 0,
  assignmentName: '',
  assignmentDesc: '',
  dueDate: '',
  priority: 'Optional',
  assignedAt: today,
  completedAt: '',
  status: 'To Do',
});

const resetForm = () => {
  form.value.internId = 0;
  form.value.assignmentName = '';
  form.value.assignmentDesc = '';
  form.value.priority = 'Optional';
  form.value.dueDate = '';
};

const formattedAssignedAt = computed(() => {
  return formatDate(form.value.assignedAt);
});

watch(
  () => form.value.priority,
  newPriority => {
    if (newPriority === 'Optional') {
      form.value.dueDate = '';
      return;
    }
    const daysToAddMap: { [key: string]: number } = {
      Urgent: 1,
      High: 2,
      Medium: 4,
      Low: 8,
    };
    const daysToAdd = daysToAddMap[newPriority];
    if (daysToAdd) {
      const startDate = new Date(form.value.assignedAt);
      startDate.setDate(startDate.getDate() + daysToAdd);
      form.value.dueDate = startDate.toISOString().split('T')[0];
    }
  }
);

onMounted(async () => {
  try {
    const mentorRes = await apiClient.get(`/api/mentors/email/${email}`);
    const mentorData = mentorRes.data;

    currentMentor.value = {
      id: mentorData.id,
      name: mentorData.name + ' ' + mentorData.surname,
    };
    form.value.mentorId = mentorData.id;

    const internRes = await apiClient.get(
      `/api/interns/mentor/${mentorData.id}`
    );
    interns.value = internRes.data.map((i: any) => ({
      id: i.id,
      name: i.name + ' ' + i.surname,
    }));
  } catch (error) {
    console.error('Veri çekilirken hata:', error);
  }
});

const submitAssignment = async () => {
  try {
    await addAssignment(form.value);
    showNotification('Görev başarıyla eklendi!', 'success');

    const internRes = await apiClient.get(
      `/api/interns/${form.value.internId}`
    );
    const internEmail = internRes.data.email;
    const internName = `${internRes.data.name} ${internRes.data.surname}`;
    const accessToken = await getAccessToken(['Mail.Send']);

    const mailPayload = {
      message: {
        subject: `Yeni Görev Atandı: ${form.value.assignmentName}`,
        body: {
          contentType: 'Text',
          content: `Merhaba ${internName},

Aşağıdaki görev mentorunuz ${
            currentMentor.value?.name
          } tarafından Lantern uygulaması üzerinden size atanmıştır:

• Görev: ${form.value.assignmentName}
• Açıklama: ${form.value.assignmentDesc || '-'}
• Öncelik: ${form.value.priority}
• Hedef Tarih: ${form.value.dueDate || 'Belirtilmedi'}

İyi çalışmalar.`,
        },
        toRecipients: [
          {
            emailAddress: {
              address: internEmail,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mailPayload),
    });

    resetForm();
  } catch (err) {
    showNotification('Görev eklenirken hata oluştu.', 'error');
    console.error('Hata:', err);
  }
};
</script>

<template>
  <div class="form-container">
    <AppNotification
      :message="notificationMessage"
      :type="notificationType"
      :show="notificationShow"
      :duration="2200"
    />
    <h2>{{ $t('assignmentForm.title') }}</h2>

    <form @submit.prevent="submitAssignment">
      <label for="mentor">{{ $t('assignmentForm.mentor') }}:</label>
      <input id="mentor" :value="currentMentor?.name" type="text" disabled />

      <label for="intern">{{ $t('assignmentForm.intern') }}:</label>
      <select id="intern" v-model="form.internId" required>
        <option value="0" disabled>
          {{ $t('assignmentForm.selectIntern') }}
        </option>
        <option v-for="intern in interns" :key="intern.id" :value="intern.id">
          {{ intern.name }}
        </option>
      </select>

      <label for="assignmentName">{{ $t('assignmentForm.name') }}:</label>
      <input
        id="assignmentName"
        v-model="form.assignmentName"
        type="text"
        required
      />

      <label for="assignmentDesc"
        >{{ $t('assignmentForm.description') }}:</label
      >
      <textarea id="assignmentDesc" v-model="form.assignmentDesc"></textarea>

      <label for="priority">{{ $t('assignmentForm.priority') }}:</label>
      <select id="priority" v-model="form.priority">
        <option v-for="option in priorityOptions" :key="option" :value="option">
          {{ $t(`priorities.${option}`) }}
        </option>
      </select>

      <label for="assignedAt">{{ $t('assignmentForm.assignedAt') }}:</label>
      <input
        id="assignedAt"
        :value="formattedAssignedAt"
        type="text"
        disabled
      />

      <label for="dueDate">{{ $t('assignmentForm.dueDate') }}:</label>
      <input
        id="dueDate"
        v-model="form.dueDate"
        type="date"
        :disabled="form.priority !== 'Optional'"
      />

      <button type="submit">{{ $t('assignmentForm.submit') }}</button>
    </form>
  </div>
</template>

<style scoped>
/* --- KAPSAYICI STİLLERİ --- */
.form-container {
  padding: 2rem; /* Geniş ekranlarda kenar boşluğu */
  display: flex;
  flex-direction: column;
  align-items: center; /* Formu yatayda ortalar */
}

/* --- BAŞLIK STİLİ --- */
h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

/* --- FORM STİLLERİ (Masaüstü için temel) --- */
form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%; /* Genişliğini kapsayıcısına göre ayarlar */
  max-width: 450px; /* Maksimum genişlik */
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

label {
  font-weight: bold;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #555;
}

input,
select,
textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box; /* Padding ve border'ın genişliğe dahil olmasını sağlar */

  /* --- TUTARLILIK İÇİN YAZI TİPİ AYARLARI --- */
  /* Modern ve hemen hemen her sistemde bulunan bir font ailesi belirliyoruz */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;

  /* Font boyutunun 16px (1rem) olduğundan emin oluyoruz */
  font-size: 1rem;

  /* Font kalınlığını normal (400) olarak ayarlıyoruz */
  font-weight: 400;

  /* Metin rengini standart bir koyu gri yapıyoruz */
  color: #333333;
}

/* --- DEVRE DIŞI BIRAKILMIŞ ELEMANLAR İÇİN ÖZEL STİL --- */
input:disabled,
textarea:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;

  /* Tarayıcının varsayılan soluklaştırma efektini tamamen geçersiz kılıyoruz */
  color: #333333;
  -webkit-text-fill-color: #333333; /* Chrome/Safari için renk zorlaması */
  opacity: 1; /* Opaklığı tam yaparak soluk görünümü engelliyoruz */
}

textarea {
  min-height: 100px;
  resize: vertical;
}

button {
  margin-top: 1rem;
  padding: 12px;
  background-color: #242441; /* Ana renk */
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

button:hover {
  background-color: #242441;
}

/* --- MOBİL UYUMLULUK (MEDIA QUERY) --- */
/* Ekran genişliği 600px veya daha az olduğunda bu stiller uygulanır */
@media (max-width: 600px) {
  .form-container {
    padding: 1rem; /* Mobil için kenar boşluğunu azalt */
  }

  form {
    padding: 1.5rem; /* Form içi boşluğu azalt */
    box-shadow: none; /* Mobilde gölgeyi kaldır */
    border: 1px solid #eee;
  }

  h2 {
    font-size: 1.5rem; /* Başlık fontunu biraz küçült */
  }
}
</style>
