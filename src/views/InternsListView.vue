<template>
  <div class="page-container">
    <h2>Stajyer Analizleri</h2>
    <p>Analiz geçmişini görmek için bir stajyer seçin.</p>

    <!-- Yüklenme Durumu -->
    <div v-if="loading">Stajyer listesi yükleniyor, lütfen bekleyin...</div>

    <!-- Hata Durumu -->
    <div v-else-if="error" class="error-box">
      <p><strong>Hata:</strong> {{ error }}</p>
      <p>
        Lütfen DBeaver üzerinden size bir stajyer atandığından emin olun ve
        sayfayı yenileyin.
      </p>
    </div>

    <!-- Başarılı Ama Boş Liste Durumu -->
    <ul v-else-if="interns.length === 0" class="intern-list">
      <li>Size atanmış herhangi bir stajyer bulunmuyor.</li>
    </ul>

    <!-- Başarılı ve Dolu Liste Durumu -->
    <ul v-else class="intern-list">
      <li v-for="intern in interns" :key="intern.id" class="intern-item">
        <span class="intern-name">{{ intern.name }} {{ intern.surname }}</span>
        <!-- Butona tıklandığında goToAnalysisDetail fonksiyonunu çağır -->
        <button @click="goToAnalysisDetail(intern.id)" class="details-button">
          Analizleri Gör
        </button>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/utils/apiClients';
import { useMsal } from 'vue3-msal-plugin';
import { useRouter } from 'vue-router'; // useRouter'ı import et

// Tip tanımları
interface Intern {
  id: number;
  name: string;
  surname: string;
}

// Değişkenler
const interns = ref<Intern[]>([]);
const loading = ref(true);
const error = ref('');
const router = useRouter(); // Router'ı kullanıma hazırla

// Komponent yüklendiğinde çalışacak kod
onMounted(async () => {
  try {
    // 1. Giriş yapmış mentorun email'ini al
    const { accounts } = useMsal();
    if (!accounts.value || accounts.value.length === 0) {
      throw new Error('Mentor bilgisi bulunamadı.');
    }
    const mentorEmail = accounts.value[0].username;

    // 2. E-posta ile mentorun ID'sini backend'den al
    console.log(`Mentor ID'si için istek atılıyor: ${mentorEmail}`);
    const mentorRes = await apiClient.get(`/api/mentors/email/${mentorEmail}`);
    const mentorId = mentorRes.data.id;
    console.log(`Mentor ID'si bulundu: ${mentorId}`);

    // 3. Mentor ID'si ile o mentora bağlı stajyerleri çek
    console.log(
      `Stajyer listesi için istek atılıyor: /api/interns/mentor/${mentorId}`
    );
    const internsRes = await apiClient.get(`/api/interns/mentor/${mentorId}`);
    interns.value = internsRes.data;
    console.log('Stajyer listesi başarıyla çekildi:', interns.value);
  } catch (err: any) {
    error.value =
      'Stajyer listesi yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
    console.error('Stajyer listesi hatası:', err);
  } finally {
    loading.value = false;
  }
});

// Stajyer detay sayfasına gitmek için fonksiyon
const goToAnalysisDetail = (internId: number) => {
  router.push({ name: 'InternAnalysisDetail', params: { internId } });
};
</script>

<style scoped>
.page-container {
  padding: 2rem;
}

.intern-list {
  list-style: none;
  padding: 0;
  margin-top: 2rem;
}

.intern-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.intern-name {
  font-weight: bold;
}

.details-button {
  background: #242441;
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}
</style>
