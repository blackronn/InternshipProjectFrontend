<template>
  <div class="register-bg">
    <div class="register-card">
      <img src="@/assets/etiya-logo.png" alt="Etiya" class="form-logo" />
      <div class="welcome-text">{{ $t('internView.welcome') }}</div>
      <h2>{{ $t('internView.title') }}</h2>
      <form @submit.prevent="onSubmit">
        <div class="field">
          <label>{{ $t('internView.name') }}</label>
          <input v-model="form.name" readonly />
        </div>
        <div class="field">
          <label>{{ $t('internView.surname') }}</label>
          <input v-model="form.surname" readonly />
        </div>
        <div class="field">
          <label>{{ $t('internView.university') }}</label>
          <select v-model="form.university" required @change="fetchDepartments">
            <option value="" disabled selected>
              {{ $t('internView.selectUniversity') }}
            </option>
            <option v-for="uni in universities" :key="uni" :value="uni">
              {{ uni }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>{{ $t('internView.department') }}</label>
          <select
            v-model="form.department"
            required
            :disabled="!departments.length"
          >
            <option value="" disabled selected>
              {{ $t('internView.selectDepartment') }}
            </option>
            <option
              v-for="dep in departments"
              :key="dep.ID"
              :value="dep.PROGRAM_NAME"
            >
              {{ dep.PROGRAM_NAME }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>{{ $t('internView.office') }}</label>
          <select v-model="form.officeId" required>
            <option value="" disabled selected>
              {{ $t('internView.selectOffice') }}
            </option>
            <option
              v-for="office in offices"
              :key="office.id"
              :value="office.id"
            >
              {{ office.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>{{ $t('internView.startDate') }}</label>
          <input
            v-model="form.internshipStart"
            type="date"
            required
            :max="form.internshipEnd || undefined"
          />
        </div>
        <div class="field">
          <label>{{ $t('internView.endDate') }}</label>
          <input
            v-model="form.internshipEnd"
            type="date"
            required
            :min="form.internshipStart || undefined"
          />
        </div>
        <div class="field">
          <label>{{ $t('internView.email') }}</label>
          <input v-model="form.email" type="email" readonly />
        </div>
        <div class="field">
          <label>{{ $t('internView.phone') }}</label>
          <input
            v-model="form.phone"
            type="tel"
            required
            maxlength="14"
            :placeholder="$t('internView.phonePlaceholder')"
            @input="formatPhone"
          />
        </div>
        <button type="submit">{{ $t('internView.submit') }}</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useMsal } from 'vue3-msal-plugin';
import { useRouter } from 'vue-router';
import api from '@/utils/apiClients';

const { instance } = useMsal();
const router = useRouter();

const universities = ref<string[]>([]);
const departments = ref<{ ID: number; PROGRAM_NAME: string }[]>([]);
const offices = ref<{ id: number; name: string }[]>([]);

const form = reactive({
  name: '',
  surname: '',
  university: '',
  department: '',
  officeId: '',
  internshipStart: '',
  internshipEnd: '',
  email: '',
  phone: '',
});

// Azure'dan ad ve soyad otomatik, readonly olacak şekilde ayarlanıyor
onMounted(async () => {
  const account = instance.getActiveAccount();
  if (account) {
    const displayName = account.name || '';
    const cleanedDisplayName = displayName.split('(')[0].trim();
    const nameParts = cleanedDisplayName.split(' ').filter(Boolean);

    if (nameParts.length === 1) {
      form.name = nameParts[0];
      form.surname = nameParts[0];
    } else if (nameParts.length === 2) {
      form.name = nameParts[0];
      form.surname = nameParts[1];
    } else {
      form.name = nameParts.slice(0, -1).join(' ');
      form.surname = nameParts[nameParts.length - 1];
    }
    form.email = account.username;
  }
  // Üniversiteleri yükle
  try {
    const res = await api.get('/api/universities');
    universities.value = res.data;
  } catch (e) {
    universities.value = [];
  }
});
try {
  const res = await api.get('/api/offices');
  offices.value = res.data;
} catch (e) {
  offices.value = [];
}

async function fetchDepartments() {
  form.department = ''; // seçili bölümü temizle
  if (!form.university) {
    departments.value = [];
    return;
  }
  try {
    const res = await api.get('/api/departments', {
      params: { university: form.university },
    });
    departments.value = res.data;
  } catch (e) {
    departments.value = [];
  }
}

function formatPhone(e: Event) {
  let value = (e.target as HTMLInputElement).value.replace(/\D/g, '');

  // Her zaman 05 ile başlasın
  if (!value.startsWith('05')) {
    value = '05' + value.replace(/^0*/, '');
  }
  value = value.slice(0, 11); // 11 rakamdan fazlasını alma

  // Format: 0511 111 11 11
  let formatted = value;
  if (value.length > 4) formatted = value.slice(0, 4) + ' ' + value.slice(4, 7);
  if (value.length > 7) formatted += ' ' + value.slice(7, 9);
  if (value.length > 9) formatted += ' ' + value.slice(9, 11);

  // Sadece boşluklardan dolayı fazlalık olmaması için
  form.phone = formatted.trim();
}

async function onSubmit() {
  // Son kontrol: Telefon 05 ile başlasın ve 11 rakam olsun
  const rawPhone = form.phone.replace(/\D/g, '');
  if (!/^05\d{9}$/.test(rawPhone)) {
    alert('Telefon numarası 05 ile başlamalı ve 11 rakam olmalı!');
    return;
  }
  const account = instance.getActiveAccount();
  if (!account) return router.replace({ name: 'Login' });

  try {
    await api.post('/api/interns', {
      name: form.name,
      surname: form.surname,
      university: form.university,
      department: form.department,
      officeId: parseInt(form.officeId),
      startDate: form.internshipStart,
      endDate: form.internshipEnd,
      email: form.email,
      phoneNumber: rawPhone,
      role: 'Intern',
    });
    alert('Stajyer kaydın başarıyla alındı!');
    router.replace({ name: 'Home' });
  } catch (e) {
    console.error('Intern kayıt hatası:', e);
    alert('Kayıtta hata oluştu.');
  }
}
</script>

<style scoped>
/* CSS'in aynı şekilde kalsın */
.register-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eaf0fd 0%, #f3f6fd 100%);
  position: relative;
  overflow: hidden;
}
.register-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('@/assets/etiya-logo.png') repeat;
  background-size: 150px auto;
  opacity: 0.09;
  pointer-events: none;
  z-index: 0;
}
.register-card {
  position: relative;
  z-index: 2;
  width: 440px;
  background: #fff;
  border-radius: 26px;
  box-shadow: 0 6px 32px 0 rgba(32, 42, 68, 0.14);
  padding: 44px 36px 38px 36px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.form-logo {
  width: 64px;
  margin-bottom: 14px;
  margin-top: -8px;
}
.welcome-text {
  margin-bottom: 22px;
  font-size: 2.1rem;
  font-weight: 900;
  color: #3251d4;
  letter-spacing: 1px;
  text-shadow: 0 2px 12px #b3c6ff33;
}
h2 {
  color: #222c51;
  font-size: 1.32rem;
  font-weight: 700;
  margin-bottom: 34px;
  margin-top: -8px;
  letter-spacing: 0.2px;
}
.field {
  width: 100%;
  margin-bottom: 12px;
  text-align: left;
}
label {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 5px;
  color: #3654b7;
  display: block;
  letter-spacing: 0.1px;
}
input,
select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #d4e2fa;
  border-radius: 10px;
  margin-top: 5px;
  font-size: 1.07rem;
  background: #f4f8ff;
  color: #223152;
  font-weight: 500;
  transition: border 0.17s;
  outline: none;
}
input:focus,
select:focus {
  border: 2px solid #3d5ae6;
  background: #fff;
}
button[type='submit'] {
  width: 100%;
  background: linear-gradient(90deg, #3865ec 60%, #203884 100%);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  border: none;
  border-radius: 11px;
  padding: 14px 0;
  margin-top: 16px;
  box-shadow: 0 2px 14px #a5bbf366;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: background 0.2s;
}
button[type='submit']:hover {
  background: linear-gradient(90deg, #1a2857 40%, #3865ec 100%);
}
</style>
