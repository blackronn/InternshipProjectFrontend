<template>
  <div class="profile-wrapper">
    <div class="profile-card">
      <button class="back-button" @click="goHome">
        ← {{ $t('mentorProfile.back') }}
      </button>
      <section
        class="profile-header"
        style="display: flex; gap: 16px; align-items: center; padding: 16px"
      >
        <AvatarCircle
          :gender="mentor?.gender"
          :size="72"
          :title="mentor?.name + ' ' + mentor?.surname"
        >
        </AvatarCircle>
        <div>
          <h2 style="margin: 0">Profil Bilgileri</h2>
          <p>
            <strong>Ad Soyad:</strong> {{ mentor?.name }} {{ mentor?.surname }}
          </p>
          <p><strong>Email:</strong> {{ mentor?.email }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMsal } from 'vue3-msal-plugin';
import apiClient from '@/utils/apiClients';
import AvatarCircle from '@/components/AvatarCircle.vue';
import { normalizeGender } from '@/utils/avatar';

type MentorResponse = {
  name: string;
  surname: string;
  email: string;
  gender: 'FEMALE' | 'MALE' | 'UNSPECIFIED' | string;
};

const router = useRouter();
const mentor = ref({
  name: '',
  surname: '',
  email: '',
  gender: 'UNSPPECIFIED',
});
const { accounts } = useMsal();
const email = accounts.value[0].username;

function _normalizeGender(raw: string | undefined) {
  if (!raw) return 'unspecified';
  const s = String(raw).toLowerCase();
  if (['female', 'kadın', 'kadin', 'f'].includes(s)) return 'female';
  if (['male', 'erkek', 'm'].includes(s)) return 'male';
  if (['unspecified', 'unknown', 'belirtilmedi', 'none', 'null'].includes(s))
    return 'unspecified';
  // backend 'FEMALE/MALE/UNSPECIFIED' gönderiyorsa:
  if (
    s === 'female'.toLowerCase() ||
    s === 'male'.toLowerCase() ||
    s === 'unspecified'.toLowerCase()
  )
    return s;
  if (s === 'female'.toUpperCase()) return 'female';
  if (s === 'male'.toUpperCase()) return 'male';
  if (s === 'unspecified'.toUpperCase()) return 'unspecified';
  return 'unspecified';
}

onMounted(async () => {
  try {
    const res = await apiClient.get(
      `/api/mentors/email/${encodeURIComponent(email)}`
    );
    mentor.value = {
      name: res.data.name,
      surname: res.data.surname,
      email: res.data.email,
      gender: res.data.gender ?? 'UNSPECIFIED',
    };
  } catch (err) {
    console.error('Profil bilgisi alınamadı:', err);
  }
});

function goHome() {
  router.push({ name: 'MentorHome' });
}
</script>

<style scoped>
.profile-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding-top: 40px;
  margin-left: 80px;
  height: 80vh;
  background-color: #fff;
  overflow: auto;
}

.profile-card {
  width: 100%;
  max-width: 750px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 32px;
  z-index: 1;
}

.profile-card h2 {
  font-size: 24px;
  font-family: sans-serif;
  margin-bottom: 24px;
  color: #333;
}

.profile-info p {
  font-size: 16px;
  font-family: sans-serif;
  margin-bottom: 12px;
  color: #222;
}

.back-button {
  background-color: white;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s ease;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.back-button:hover {
  background-color: #f5f5f5;
}
</style>
