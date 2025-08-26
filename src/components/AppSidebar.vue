<!-- src/components/AppSidebar.vue -->
<template>
  <div class="sidebar-container">
    <!-- Logo bölümü -->
    <router-link to="/home" class="logo-link">
      <img src="@/assets/logo.png" alt="Logo" class="logo" />
    </router-link>

    <!-- Menü -->
    <nav class="sidebar">
      <router-link to="/home/assignmentlist">{{
        $t('sidebar.assignments')
      }}</router-link>
      <router-link to="/home/timesheet">{{
        $t('sidebar.timesheet')
      }}</router-link>
      <router-link to="/home/report">{{ $t('sidebar.journal') }}</router-link>
      <router-link to="/home/office">{{
        $t('sidebar.officeInfo')
      }}</router-link>
      <router-link to="/home/staff">{{
        $t('sidebar.supportStaff')
      }}</router-link>
      <router-link to="/home/sendreport">{{
        $t('sidebar.sendReport')
      }}</router-link>
    </nav>

    <!-- Alt Kısım -->
    <div class="sidebar-bottom">
      <router-link to="/home/faq" class="faq-link">{{
        $t('sidebar.faq')
      }}</router-link>

      <!-- Dil Seçici -->
      <div class="language-switch">
        <button @click="setLanguage('tr')" :class="{ active: locale === 'tr' }">
          TR
        </button>
        <button @click="setLanguage('en')" :class="{ active: locale === 'en' }">
          EN
        </button>
      </div>

      <router-link to="/home/about" class="about-link">{{
        $t('sidebar.about')
      }}</router-link>

      <div class="sidebar-version">{{ APP_VERSION }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { APP_VERSION } from '@/utils/version';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();

function setLanguage(lang: string) {
  locale.value = lang;
}
</script>

<style scoped>
.sidebar-container {
  width: 220px;
  height: 100vh;
  background: #242441;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 20px 20px 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  overflow-y: auto;
}

.logo-link {
  margin-bottom: 20px;
  text-align: center;
  display: block;
  padding-left: 20px;
}

.logo {
  max-width: 150px;
  max-height: 80px;
  object-fit: contain;
}

.sidebar {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}

.sidebar a {
  font-family: sans-serif;
  color: white;
  text-decoration: none;
  padding: 10px 14px;
  background-color: transparent;
  margin-bottom: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.sidebar a:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.sidebar a.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.3);
}

.sidebar-container::-webkit-scrollbar {
  width: 6px;
}

.sidebar-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
}

.sidebar-bottom {
  font-family: sans-serif;
  margin-top: auto;
  padding-bottom: 30px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 20px;
}

.faq-link,
.about-link {
  color: white;
  text-decoration: none;
  padding: 10px 14px;
  background-color: transparent;
  margin-bottom: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 500;
  transition: background-color 0.2s ease;
  width: 84%;
}

.faq-link:hover,
.about-link:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.about-link.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.3);
}

.sidebar-version {
  width: 100%;
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 13px;
  color: #ccc;
  letter-spacing: 1px;
  text-align: center;
}

/* 🌐 Dil Seçici */
.language-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 4px;
}

.language-switch button {
  background-color: transparent;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.language-switch button.active,
.language-switch button:hover {
  background-color: rgba(255, 255, 255, 0.25);
}
</style>
