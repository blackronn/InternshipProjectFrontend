<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createEvaluation,
  getEvaluationByMentorAndIntern,
  updateEvaluation,
  type EvaluationCreateRequest,
  type EvaluationUpdateRequest,
} from '../api/evaluations';

const success = ref('');

const mode = ref<'create' | 'edit'>('create');
const evaluationId = ref<number | null>(null);
const askToEdit = ref(false);

const route = useRoute();
const router = useRouter();

const internId = Number(route.params.internId);
const mentorId = Number(localStorage.getItem('mentor_id') || 0);

const form = ref<{ comment: string }>({
  comment: '',
});

const ratings = reactive<Record<string, number | null>>({
  punctuality: null,
  communication: null,
  technical: null,
  teamwork: null,
});

const fields = [
  { key: 'punctuality', label: 'Zamanında gelme' },
  { key: 'communication', label: 'İletişim' },
  { key: 'technical', label: 'Teknik beceri' },
  { key: 'teamwork', label: 'Takım çalışması' },
];

const loading = ref(false);
const error = ref('');

const average = computed(() => {
  const vals = Object.values(ratings).filter(
    v => typeof v === 'number'
  ) as number[];
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return +(sum / vals.length).toFixed(1);
});

const canSubmit = computed(
  () =>
    Object.values(ratings).every(v => typeof v === 'number') &&
    !!mentorId &&
    !!internId &&
    !loading.value
);

onMounted(async () => {
  try {
    const existing = await getEvaluationByMentorAndIntern(mentorId, internId);
    if (existing) {
      // Edit moduna geç
      mode.value = 'edit';
      evaluationId.value = existing.id;

      // Backend -> UI eşleme
      ratings.communication = existing.communicationRating;
      ratings.teamwork = existing.teamworkRating;
      ratings.technical = existing.problemSolvingRating;
      ratings.punctuality = existing.responsibilityRating;
      form.value.comment = existing.comment ?? '';

      // Üste “güncellemek ister misiniz?” sorusunu göster
      askToEdit.value = true;
    }
  } catch (e) {
    console.debug('[eval] no existing evaluation yet');
  }
});

async function submit() {
  if (!canSubmit.value || average.value == null) return;

  loading.value = true;
  error.value = '';
  success.value = '';

  const base = {
    communicationRating: ratings.communication!,
    teamworkRating: ratings.teamwork!,
    problemSolvingRating: ratings.technical!,
    responsibilityRating: ratings.punctuality!,
    comment: (form.value.comment || '').trim(),
  };

  try {
    if (mode.value === 'edit' && evaluationId.value) {
      const payload: EvaluationUpdateRequest = {
        ...base,
        requestingMentorId: mentorId,
      };

      await updateEvaluation(evaluationId.value, payload, mentorId);

      success.value = 'Güncellendi.';
    } else {
      const payload: EvaluationCreateRequest = { mentorId, internId, ...base };
      await createEvaluation(payload);
      success.value = 'Kaydedildi.';
    }

    router.push({
      name: 'MentorEvaluationsList',
      query: { [mode.value === 'edit' ? 'updated' : 'saved']: '1' },
    });
  } catch (e: any) {
    if (e?.response?.status === 409) {
      try {
        const existing = await getEvaluationByMentorAndIntern(
          mentorId,
          internId
        );
        if (existing) {
          mode.value = 'edit';
          evaluationId.value = existing.id;
          ratings.communication = existing.communicationRating;
          ratings.teamwork = existing.teamworkRating;
          ratings.technical = existing.problemSolvingRating;
          ratings.punctuality = existing.responsibilityRating;
          form.value.comment = existing.comment || '';
        }
      } catch (fetchErr) {
        void fetchErr;
      }
      error.value = '';
      askToEdit.value = true;
      loading.value = false;
      return;
    }
    error.value = e?.response?.data?.message ?? e?.message ?? 'Kaydedilemedi';
  } finally {
    loading.value = false;
  }
}

function toNumber(v: string | number | null) {
  return v === null || v === '' ? null : Number(v);
}
</script>

<template>
  <div class="page">
    <div class="header">
      <h1>Değerlendirme Formu</h1>
      <div class="meta">
        Stajyer ID: <b>{{ internId }}</b>
      </div>
    </div>
    <!-- GÜNCELLEME BANNERI -->
    <div v-if="mode === 'edit' && askToEdit" class="confirm">
      Bu stajyer için daha önce değerlendirme yapılmış. Bu formu
      <b>güncellemek</b> ister misiniz?
      <div class="confirm-actions">
        <button type="button" class="btn primary" @click="askToEdit = false">
          Evet, düzenle
        </button>
        <router-link class="btn ghost" :to="{ name: 'MentorEvaluationsList' }"
          >Hayır</router-link
        >
      </div>
    </div>

    <div v-if="error" class="alert">{{ error }}</div>

    <div v-if="success" class="success">{{ success }}</div>

    <div class="form-grid">
      <div class="field" v-for="f in fields" :key="f.key">
        <label :for="f.key">{{ f.label }}</label>
        <select
          :id="f.key"
          :value="ratings[f.key]"
          @change="
            ratings[f.key] = toNumber(
              ($event.target as HTMLSelectElement).value
            )
          "
        >
          <option :value="null" disabled>Seçiniz</option>
          <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>

      <div class="field col-span-2">
        <label for="comment">Yorum (opsiyonel)</label>
        <textarea
          id="comment"
          rows="4"
          v-model="form.comment"
          placeholder="Kısa notunuzu yazabilirsiniz..."
        ></textarea>
      </div>
    </div>

    <div class="footer">
      <div class="avg">
        Ortalama: <b>{{ average ?? '—' }}</b> / 5
      </div>
      <div class="actions">
        <router-link class="btn ghost" :to="{ name: 'MentorEvaluationsList' }"
          >İptal</router-link
        >
        <button class="btn primary" :disabled="!canSubmit" @click="submit">
          {{
            loading
              ? mode === 'edit'
                ? 'Güncelleniyor…'
                : 'Kaydediliyor…'
              : mode === 'edit'
              ? 'Güncelle'
              : 'Kaydet'
          }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 880px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.75rem;
}
.meta {
  color: #555;
  font-size: 0.95rem;
}
.alert {
  background: #fff3f0;
  color: #8a2200;
  border: 1px solid #ffd6cc;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 700px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.col-span-2 {
  grid-column: span 2;
}
.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
}
select,
textarea {
  width: 100%;
  padding: 0.6rem 0.7rem;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  outline: none;
}
select:focus,
textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.btn {
  border-radius: 12px;
  padding: 0.55rem 1rem;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;
}
.btn.primary {
  background: #111827;
  color: #fff;
}
.btn.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn.ghost {
  background: #fff;
  border-color: #e5e7eb;
  color: #111;
}
.confirm {
  background: #fff8e6;
  border: 1px solid #ffe6a7;
  color: #6b4e00;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.confirm-actions {
  display: flex;
  gap: 8px;
}

.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}
</style>
