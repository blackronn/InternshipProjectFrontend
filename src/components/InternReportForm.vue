<template>
  <div class="form-container">
    <h2>Günlük Rapor</h2>

    <!-- Hata veya Yükleniyor Durumları -->
    <div v-if="questionsLoading">Sorular yükleniyor...</div>
    <div v-if="questionsError" class="error">{{ questionsError }}</div>

    <!--
      Ana Form: Sadece sorular yüklendiğinde ve hata olmadığında gösterilir.
      Bu form hem PDF yükleme alanını hem de soru-cevap bölümünü kapsar.
    -->
    <form
      v-if="!questionsLoading && !questionsError"
      @submit.prevent="openConfirmation"
    >
      <!-- ====================================================== -->
      <!-- ==      1. YENİ EKLENEN PDF YÜKLEME BÖLÜMÜ          == -->
      <!-- ====================================================== -->
      <div class="form-section">
        <label for="file"
          ><strong>Adım 1:</strong> Günlük Rapor Dosyanızı Yükleyin (PDF,
          DOCX)</label
        >
        <input
          id="file"
          type="file"
          @change="handleFile"
          accept=".pdf,.doc,.docx"
          required
        />
      </div>
      <!-- ====================================================== -->

      <hr />
      <!-- İki bölümü ayıran görsel çizgi -->

      <!-- ====================================================== -->
      <!-- ==    2. MEVCUT SORU-CEVAP BÖLÜMÜ (Değişiklik Yok)   == -->
      <!-- ====================================================== -->
      <div class="form-section">
        <label><strong>Adım 2:</strong> Günlük Soruları Cevaplayın</label>

        <div
          v-for="(question, index) in questions"
          :key="question.id"
          class="question-box"
        >
          <label :for="'question-' + question.id">{{ question.text }}</label>
          <textarea
            :id="'question-' + question.id"
            v-model="answers[index].answer"
            rows="4"
            required
          ></textarea>
        </div>
      </div>
      <!-- ====================================================== -->

      <!-- Gönder Butonu ve Hata Mesajı Alanı -->
      <button type="submit">Gönder</button>
      <p v-if="message" :class="status">{{ message }}</p>
    </form>

    <!-- ONAY MODALI (Bu kısım zaten kodunda vardı, aynı kalıyor) -->
    <div class="modal-overlay" v-if="showModal">
      <div class="modal-box">
        <h3>Raporu göndermek istediğinize emin misiniz?</h3>
        <div class="modal-buttons">
          <button class="confirm" @click="sendReport">Evet, Gönder</button>
          <button class="cancel" @click="showModal = false">İptal</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMsal } from 'vue3-msal-plugin';
import { getAccessToken } from '@/utils/msalHelpers';
import apiClient from '@/utils/apiClients';

// --- Tip Tanımları (Type Definitions) ---
interface Question {
  id: number;
  text: string;
  category: string;
}

interface Answer {
  internId: number | null;
  questionId: number;
  answer: string;
}

// --- Reaktif Değişkenler (State) ---
const file = ref<File | null>(null);
const message = ref('');
const status = ref<'success' | 'error'>('success');
const showModal = ref(false);

// Stajyer ve Mentor Bilgileri
const internId = ref<number | null>(null);
const internEmail = ref('');
const internName = ref('');
const mentorEmail = ref('');
const mentorName = ref('');
const managerEmail = ref('');

// Soru ve Cevaplar
const questions = ref<Question[]>([]);
const answers = ref<Answer[]>([]);
const questionsLoading = ref(true);
const questionsError = ref('');

// --- Yaşam Döngüsü (Lifecycle Hook) ---
onMounted(async () => {
  try {
    const { accounts } = useMsal();
    if (!accounts.value || accounts.value.length === 0) {
      throw new Error('Kullanıcı bilgisi bulunamadı.');
    }
    internEmail.value = accounts.value[0].username;
    internName.value = accounts.value[0].name || '';

    const res = await apiClient.get(
      `/api/interns/by-email?email=${internEmail.value}`
    );
    internId.value = res.data.id;
    mentorEmail.value = res.data.mentorEmail;
    mentorName.value = res.data.mentorName || 'Mentor';
    managerEmail.value = res.data.managerEmail || '';

    const questionsRes = await apiClient.get('/api/questions/today');
    questions.value = questionsRes.data;

    answers.value = questions.value.map(q => ({
      internId: internId.value,
      questionId: q.id,
      answer: '',
    }));
  } catch (e) {
    console.error('Sayfa yüklenirken hata oluştu:', e);
    questionsError.value =
      'Gerekli bilgiler yüklenemedi. Lütfen sayfayı yenileyin.';
    status.value = 'error';
  } finally {
    questionsLoading.value = false;
  }
});

// --- Metotlar (Methods) ---
const handleFile = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) {
    file.value = null;
    return;
  }

  const selectedFile = input.files[0];
  const allowedExtensions = ['pdf', 'docx', 'doc'];
  const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    message.value = 'report.invalidFile';
    status.value = 'error';
    file.value = null;
    input.value = '';
    return;
  }
  file.value = selectedFile;
  message.value = '';
};

const openConfirmation = () => {
  const allAnswered = answers.value.every(a => a.answer.trim() !== '');
  // Hem file.value'nun hem de allAnswered'ın true olmasını kontrol eder.
  if (!file.value || !allAnswered) {
    message.value = 'Lütfen rapor dosyasını seçin ve tüm soruları cevaplayın.';
    status.value = 'error';
    return;
  }
  message.value = '';
  status.value = 'success';
  showModal.value = true;
};

const sendReport = async () => {
  showModal.value = false;

  // Adım 1: Cevapları Backend'e Gönder
  try {
    await apiClient.post('/api/questions/submit', answers.value);
  } catch (err) {
    console.error('Cevaplar gönderilirken hata:', err);
    message.value = 'Cevaplarınız kaydedilirken bir hata oluştu.';
    status.value = 'error';
    return;
  }

  // Adım 2: PDF Dosyasını E-posta Olarak Gönder
  if (file.value) {
    try {
      const accessToken = await getAccessToken();
      const base64 = await toBase64(file.value);

      const mailPayload = {
        message: {
          subject: `Günlük Rapor - ${internName.value}`,
          body: {
            contentType: 'Text',
            content: `Merhaba ${mentorName.value},\n\nStajyer ${internName.value} (${internEmail.value}) tarafından günlük staj raporu ve cevapları gönderildi.`,
          },
          toRecipients: [{ emailAddress: { address: mentorEmail.value } }],
          ccRecipients: managerEmail.value
            ? [{ emailAddress: { address: managerEmail.value } }]
            : [],
          attachments: [
            {
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: file.value.name,
              contentBytes: base64,
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

      message.value = 'report.success';
      status.value = 'success';

      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      file.value = null;
      answers.value.forEach(a => (a.answer = ''));
    } catch (err) {
      console.error('E-posta gönderilirken hata:', err);
      message.value =
        'Cevaplar kaydedildi ancak rapor e-postası gönderilemedi.';
      status.value = 'error';
    }
  }
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });
}
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
  font-size: 0.9rem;
  color: #555;
}

input[type='file'] {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  font-size: 0.95rem;
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

.success {
  color: green;
}

.error {
  color: red;
}

/* ✅ Modal Stili */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  padding: 24px;
  border-radius: 10px;
  width: 90%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.modal-box h3 {
  font-size: 1.1rem;
  margin-bottom: 1.2rem;
  color: #333;
}

.modal-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.modal-buttons .confirm {
  background-color: #242441;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.modal-buttons .cancel {
  background-color: #ccc;
  color: black;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* === YENİ EKLENECEK STİLLER === */

/* Genel form bölümlerini ayırmak için */
.form-section {
  width: 100%;
  margin-bottom: 1.5rem; /* Bölümler arası boşluk */
}

/* "Günlük Sorular" başlığı için */
.form-section h3 {
  margin-bottom: 1rem;
  color: #333;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}

/* Her bir soru ve cevap kutusunu saran ana kutu */
.question-box {
  background-color: #f9f9f9;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 1rem; /* Soru kutuları arası boşluk */
}

/* Soru metni (label) için ek stil */
.question-box label {
  font-weight: bold;
  font-size: 1rem;
  color: #333;
  display: block;
  margin-bottom: 0.8rem;
}

/* Cevap yazılacak textarea için stil */
textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical; /* Kullanıcının dikeyde boyutlandırmasına izin verir */
  box-sizing: border-box; /* Padding ve border'ın genişliğe dahil olmasını sağlar */
  min-height: 100px; /* Minimum yükseklik */
}

/* İki bölüm arasına giren yatay çizgi */
hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 2rem 0; /* Üstten ve alttan boşluk */
}

/* ... Mevcut stil kodların burada devam eder ... */
</style>
