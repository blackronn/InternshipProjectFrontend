homeview
<template>
  <div class="home-layout">
    <AppSidebar />

    <div class="home-content">
      <!-- SAĞ ÜST PROFİL ALANI -->
      <div
        class="profile-container"
        @mouseenter="showMenu = true"
        @mouseleave="showMenu = false"
      >
        <AvatarCircle :gender="normGender" :size="32" :title="displayName" />
        <div v-if="showMenu" class="dropdown-menu">
          <router-link to="/home/profile"
            >💻 {{ $t('home.profile') }}</router-link
          >
          <a href="#" @click.prevent="handleLogout"
            >🚪 {{ $t('home.logout') }}</a
          >
        </div>
      </div>

      <!-- SAYFA İÇERİĞİ -->
      <div class="main-view">
        <router-view v-slot="{ Component }">
          <div v-if="Component">
            <component :is="Component" />
          </div>
          <div v-else class="dashboard-wrapper">
            <Dashboard />
          </div>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { msalApp } from '@/main';
import AppSidebar from '@/components/AppSidebar.vue';
import type { AccountInfo } from '@azure/msal-browser';
import Dashboard from '@/views/InternDashboard.vue';
import { useI18n } from 'vue-i18n';
import AvatarCircle from '@/components/AvatarCircle.vue';
import apiClient from '@/utils/apiClients';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const showMenu = ref(false);
const isMsalReady = ref(false);
const account = ref<AccountInfo | null>(null);
const internGender = ref<'FEMALE' | 'MALE' | 'UNSPECIFIED' | string>(
  'UNSPECIFIED'
);

onMounted(() => {
  const active = msalApp.getActiveAccount();
  if (active) {
    account.value = active;
    isMsalReady.value = true;
    fetchInternGender(active.username);
  }
});

const displayName = computed(() => account.value?.name ?? 'Kullanıcı');

function normalize(g?: string) {
  const s = String(g || '').toLowerCase();
  if (['female', 'kadın', 'kadin', 'f'].includes(s)) return 'female';
  if (['male', 'erkek', 'm'].includes(s)) return 'male';
  if (['female', 'male', 'unspecified'].includes(s)) return s as any;
  return 'unspecified';
}
const normGender = computed(() => normalize(internGender.value));

async function fetchInternGender(email: string) {
  try {
    const { data } = await apiClient.get('/api/interns/by-email', {
      params: { email },
    });
    internGender.value = data?.gender ?? 'UNSPECIFIED';
  } catch (e) {
    console.warn('Intern gender alınamadı:', e);
    internGender.value = 'UNSPECIFIED';
  }
}

const isAdmin = computed(() => {
  const roles = (account.value?.idTokenClaims as any)?.roles || [];
  return roles.includes('3');
});

async function handleLogout() {
  if (!isMsalReady.value || !account.value) {
    console.warn('MSAL instance not ready or no active account.');
    return;
  }

  try {
    await msalApp.logoutPopup();
    account.value = null;
    isMsalReady.value = false;
    router.push({ name: 'Login' });
  } catch (error) {
    console.error('Logout error:', error);
    alert(t('home.logoutError'));
  }
}
</script>

<style scoped>
.home-layout {
  display: flex;
  height: 95vh;
  overflow-y: auto;
  overflow-x: hidden;
  overflow: hidden;
}

.home-content {
  flex-grow: 1;
  margin-left: 220px;
  position: relative;
  min-height: 100vh;
  background: white;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 0px;
  box-sizing: border-box;
  overflow-y: auto;
}

.profile-container {
  position: fixed;
  top: 12px;
  right: 16px;
  z-index: 1000;
}

.profile-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #242441;
  cursor: pointer;
}

.dropdown-menu {
  font-family: sans-serif;
  position: absolute;
  right: 0;
  top: 40px;
  background: white;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  overflow: hidden;
  min-width: 140px;
  z-index: 999;
}

.dropdown-menu a,
.dropdown-menu router-link {
  display: block;
  padding: 10px;
  color: #333;
  text-decoration: none;
  transition: background 0.2s;
}

.dropdown-menu a:hover,
.dropdown-menu router-link:hover {
  background-color: #f0f0f0;
}

.main-view {
  padding: 20px;
  width: 100%;
  max-width: 1000px;
}

.dashboard-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.language-switch {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1000;
}

.language-switch button {
  background-color: transparent;
  border: 1px solid #aaa;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  color: #333;
  transition: background 0.2s ease;
}

.language-switch button:hover {
  background-color: #f0f0f0;
}
</style>
