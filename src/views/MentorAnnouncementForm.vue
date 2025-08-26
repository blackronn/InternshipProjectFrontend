<template>
  <div class="form-container">
    <AppNotification
      :message="notificationMessage"
      :type="notificationType"
      :show="notificationShow"
      :duration="2200"
    />
    <h2>{{ $t('mentorAnnouncementForm.title') }}</h2>
    <form @submit.prevent="submitAnnouncement">
      <label for="title">{{ $t('mentorAnnouncementForm.labelTitle') }}</label>
      <input id="title" v-model="title" type="text" required />

      <label for="content">{{
        $t('mentorAnnouncementForm.labelContent')
      }}</label>
      <!-- textarea self-closing olmamalı -->
      <textarea id="content" v-model="content" required></textarea>

      <button type="submit">
        {{ $t('mentorAnnouncementForm.submitButton') }}
      </button>
    </form>
  </div>

  <div>
    <h2>{{ $t('mentorAnnouncementForm.myAnnouncement') }}</h2>
    <div class="announcements-grid">
      <div v-for="(announcement, index) in announcements" :key="index">
        <h3>{{ announcement.title }}</h3>
        <p>{{ announcement.content }}</p>
        <button @click="deleteAnnouncement(announcement.id)">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/utils/apiClients';
import AppNotification from '@/components/AppNotification.vue';
import { useMsal } from 'vue3-msal-plugin';

const title = ref('');
const content = ref('');
const mentorId = ref<number | null>(null);

const notificationMessage = ref('');
const notificationType = ref<'success' | 'error' | 'info'>('info');
const notificationShow = ref(false);

interface Announcement {
  id?: number;
  title: string;
  content: string;
  createdAt: string;
  mentorId?: number;
}

const announcements = ref<Announcement[]>([]);

const { accounts } = useMsal();
const email = accounts.value[0]?.username ?? '';

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

onMounted(async () => {
  try {
    const res = await apiClient.get(
      `/api/mentors/email/${encodeURIComponent(email)}`
    );
    mentorId.value = res.data.id;
    await loadAnnouncements();
  } catch (err) {
    console.error('Mentor ID alınamadı:', err);
    showNotification('mentorAnnouncementForm.mentorError', 'error');
  }
});

const deleteAnnouncement = async (id?: number) => {
  if (!id) return;

  try {
    await apiClient.delete(`/api/announcements/${id}`);
    showNotification('Announcement deleted', 'success');
    await loadAnnouncements();
  } catch (err: any) {
    console.error('Duyuru silinemedi:', err);
    showNotification('Announcement deletion failed', 'error');
  }
};

const loadAnnouncements = async () => {
  if (!mentorId.value) return;

  try {
    // Direkt mentor'a özel endpoint kullan
    const res = await apiClient.get(
      `/api/announcements/mentor/${mentorId.value}`
    );
    announcements.value = res.data;
    console.log('Mentor duyuru sayısı:', announcements.value.length);
  } catch (err) {
    console.error('Duyurular yüklenemedi:', err);
  }
};

const submitAnnouncement = async () => {
  if (!title.value || !content.value) {
    showNotification('mentorAnnouncementForm.emptyFields', 'error');
    return;
  }

  if (!mentorId.value) {
    showNotification('mentorAnnouncementForm.mentorMissing', 'error');
    return;
  }

  try {
    await apiClient.post('/api/announcements', {
      title: title.value,
      content: content.value,
      mentorId: mentorId.value,
    });

    showNotification('mentorAnnouncementForm.success', 'success');
    title.value = '';
    content.value = '';
    await loadAnnouncements();
  } catch (err) {
    showNotification('mentorAnnouncementForm.failure', 'error');
    console.error(err);
  }
};
</script>

<style scoped>
.form-container {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
h2 {
  margin-bottom: 1.5rem;
  color: #333;
}
form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  max-width: 450px;
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
textarea {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica,
    Arial, sans-serif;
  font-size: 1rem;
  font-weight: 400;
  color: #333;
}
textarea {
  min-height: 100px;
  resize: vertical;
}
button {
  margin-top: 1rem;
  padding: 12px;
  background-color: #242441;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
button:hover {
  background-color: #1e1e38;
}
@media (max-width: 600px) {
  .form-container {
    padding: 1rem;
  }
  form {
    padding: 1.5rem;
    box-shadow: none;
    border: 1px solid #eee;
  }
  h2 {
    font-size: 1.5rem;
  }
}
.announcements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.announcement-card {
  background-color: #f0f0f0;
  padding: 1rem;
  border-radius: 8px;
}
</style>
