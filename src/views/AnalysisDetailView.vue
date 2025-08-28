<template>
  <div class="page-container">
    <router-link to="/mentorhome/analysis" class="back-button"
      >← Stajyer Listesine Dön
    </router-link>
    <h2>{{ internName }} - Analiz Geçmişi</h2>

    <div v-if="loading">Yükleniyor...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="!loading && results.length > 0" class="analysis-cards">
      <div v-for="result in results" :key="result.id" class="analysis-card">
        <h3 class="card-date">{{ formatDate(result.analysisDate) }}</h3>
        <div class="scores">
          <span class="score-box"
            >Gelişim: <strong>{{ result.developmentScore }} / 10</strong></span
          >
          <span class="score-box"
            >Motivasyon:
            <strong>{{ result.motivationScore }} / 10</strong></span
          >
        </div>
        <p class="summary-title"><strong>AI Özet:</strong></p>
        <p class="summary-text">{{ result.summary }}</p>
        <p>
          <strong>Risk Seviyesi:</strong>
          <span :class="`risk-${result.riskLevel.toLowerCase()}`">{{
            result.riskLevel
          }}</span>
        </p>
      </div>
    </div>
    <p v-else-if="!loading">Bu stajyer için analiz sonucu bulunmuyor.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/utils/apiClients';

const results = ref<any[]>([]);
const loading = ref(true);
const error = ref('');
const internName = ref('');
const route = useRoute();
const internId = route.params.internId;

onMounted(async () => {
  try {
    const internRes = await apiClient.get(`/api/interns/${internId}`);
    internName.value = internRes.data.name + ' ' + internRes.data.surname;

    const analysisRes = await apiClient.get(
      `/api/analysis/intern/${internId}/history`
    );
    results.value = analysisRes.data;
  } catch (err) {
    error.value = 'Analiz geçmişi yüklenemedi.';
    console.error(err);
  } finally {
    loading.value = false;
  }
});

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>

<style scoped>
.page-container {
  padding: 2rem;
}

.back-button {
  display: inline-block;
  margin-bottom: 2rem;
}

.analysis-cards {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.analysis-card {
  background: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-date {
  margin-top: 0;
}

.scores {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.score-box {
  background: #eee;
  padding: 0.5rem;
  border-radius: 4px;
}

.summary-title {
  margin-bottom: 0.5rem;
}

.summary-text {
  font-style: italic;
}

.risk-yüksek {
  color: red;
  font-weight: bold;
}

.risk-orta {
  color: orange;
  font-weight: bold;
}

.risk-düşük {
  color: green;
  font-weight: bold;
}
</style>
