<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMsal } from 'vue3-msal-plugin';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import apiClient from '@/utils/apiClients'; // Your configured axios instance

// This interface matches the OfficeResponse DTO from the backend
interface Office {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
  transportDetails: string;
}

const officeInfo = ref<Office | null>(null);
const isLoading = ref(true);
const error = ref<string | null>(null);

const { instance, accounts } = useMsal();
const { t } = useI18n();

onMounted(async () => {
  try {
    if (accounts.value.length === 0) {
      throw new Error('Kullanıcı girişi yapılmamış.');
    }

    // Step 1: Kullanıcının email'ini al
    const account = accounts.value[0];
    const userEmail = account.username;
    console.log('Kullanıcı email:', userEmail);

    // Step 2: Kullanıcının rolünü kontrol et
    try {
      // Önce intern olarak dene
      console.log('Intern API çağrısı yapılıyor...');
      const internResponse = await apiClient.get('/api/interns/by-email', {
        params: { email: userEmail },
      });
      console.log('Intern API yanıtı:', internResponse.data);

      const intern = internResponse.data;

      if (intern && intern.office) {
        console.log("DB'den gelen office bilgisi:", intern.office);

        // Eğer office bilgileri eksikse, direkt office API'sini çağır
        if (!intern.office.address || !intern.office.phoneNumber) {
          console.log(
            'Office bilgileri eksik, direkt API çağrısı yapılıyor...'
          );
          const fullOfficeResponse = await apiClient.get(
            `/api/offices/${intern.office.id}`
          );
          console.log('Direkt office API yanıtı:', fullOfficeResponse.data);
          officeInfo.value = fullOfficeResponse.data;
        } else {
          officeInfo.value = intern.office;
        }
        return; // Intern ise burada bitir
      }
    } catch (internErr) {
      console.log('Kullanıcı intern değil, mentor olarak kontrol ediliyor...');
    }

    // Step 3: Mentor ise Azure'den adres çek
    const tokenResponse = await instance
      .acquireTokenSilent({
        scopes: ['User.Read'],
        account: account,
      })
      .catch(async e => {
        if (e instanceof InteractionRequiredAuthError) {
          return await instance.acquireTokenPopup({ scopes: ['User.Read'] });
        }
        throw e;
      });

    if (!tokenResponse) {
      throw new Error('Access Token alınamadı.');
    }

    const graphResponse = await apiClient.get(
      'https://graph.microsoft.com/v1.0/me?$select=streetAddress',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
        },
      }
    );

    const userStreetAddress = graphResponse.data.streetAddress;
    if (!userStreetAddress) {
      throw new Error(
        'Azure AD kullanıcı profilinde adres bilgisi bulunamadı.'
      );
    }

    const officeDetailsResponse = await apiClient.get<Office>(
      '/api/offices/by-address',
      {
        params: {
          address: userStreetAddress,
        },
      }
    );

    officeInfo.value = officeDetailsResponse.data;
  } catch (err: any) {
    console.error('Ofis bilgileri alınırken hata oluştu:', err);
    if (err.response && err.response.status === 404) {
      error.value = t('officeInfo.error404');
    } else {
      error.value = t('officeInfo.errorGeneral');
    }
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="office-container">
    <div v-if="isLoading" class="state-message">
      {{ $t('officeInfo.loading') }}
    </div>
    <div v-else-if="error" class="state-message error-message">{{ error }}</div>

    <div v-else-if="officeInfo" class="office-card">
      <h2>📍 {{ officeInfo.name }} {{ $t('officeInfo.officeTitle') }}</h2>
      <div class="info-item">
        <strong>{{ $t('officeInfo.address') }}:</strong>
        <p>{{ officeInfo.address }}</p>
      </div>
      <div class="info-item">
        <strong>{{ $t('officeInfo.phone') }}:</strong>
        <p>{{ officeInfo.phoneNumber }}</p>
      </div>
      <div class="info-item">
        <strong>{{ $t('officeInfo.transport') }}:</strong>
        <p>{{ officeInfo.transportDetails }}</p>
      </div>
    </div>

    <div v-else class="state-message">
      {{ $t('officeInfo.notFound') }}
    </div>
  </div>
</template>

<style scoped>
.office-container {
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 80vh;
  background-color: #ffffff;
}
.office-card {
  font-family: sans-serif;
  width: 100%;
  max-width: 600px;
  background-color: white;
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}
h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  color: #2c3e50;
  text-align: center;
  font-weight: 600;
}
.info-item {
  margin-bottom: 1.5rem;
}
.info-item strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #34495e;
  font-size: 1rem;
  font-weight: 500;
}
.info-item p {
  margin: 0;
  color: #555;
  line-height: 1.6;
}
.state-message {
  font-size: 1.2rem;
  color: #7f8c8d;
}
.error-message {
  color: #e74c3c;
}
</style>
