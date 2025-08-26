// src/utils/timelogService.ts

import apiClient from '@/utils/apiClients';

export interface TimeLog {
  id?: number;
  spentTimeInHours: number; // saat cinsinden (backend field name)
  logDate: string; // ISO string format
  assignmentId: number;
  internId: number;
  // Backend'den gelebilecek ek bilgiler
  assignmentName?: string;
  internName?: string;
  createdAt?: string;
  updatedAt?: string;
}

//  Yeni time log girişi oluştur
export const createTimeLog = async (
  timeLog: Omit<TimeLog, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TimeLog> => {
  console.log('🌐 createTimeLog çağrıldı');
  console.log('📤 Gönderilen veri (frontend hours):', timeLog);
  console.log('🔗 Endpoint: /api/timelogs');

  // Backend kontratı: spentTimeInHours ve ISO LocalDateTime (YYYY-MM-DDTHH:mm:ss)
  const ensureLocalDateTime = (dateStr: string): string => {
    if (!dateStr) return '';
    // Zaten saat içeriyorsa dokunma
    if (dateStr.includes('T') && dateStr.length >= 16) {
      // Eğer sondaki 'Z' varsa kaldır (LocalDateTime bekleniyor olabilir)
      return dateStr.replace(/Z$/, '').slice(0, 19);
    }
    return `${dateStr}T00:00:00`;
  };

  const payload = {
    spentTimeInHours: Number((timeLog as any).spentTimeInHours),
    logDate: ensureLocalDateTime(timeLog.logDate),
    assignmentId: timeLog.assignmentId,
    internId: timeLog.internId,
  } as any;

  try {
    const response = await apiClient.post<TimeLog>('/api/timelogs', payload);
    console.log('✅ API yanıtı başarılı:', response.data);
    return response.data as any;
  } catch (error: any) {
    console.error(' API hatası:', error);
    console.error(' Hata detayı:', error.response?.data);
    console.error(' Hata status:', error.response?.status);
    throw error;
  }
};

//  Tüm zaman kayıtlarını listele
export const getAllTimeLogs = async (): Promise<TimeLog[]> => {
  const response = await apiClient.get<TimeLog[]>('/api/timelogs');
  return response.data;
};

//  Belirli bir zaman kaydını getir
export const getTimeLogById = async (id: number): Promise<TimeLog> => {
  const response = await apiClient.get<TimeLog>(`/api/timelogs/${id}`);
  return response.data;
};

//  Intern'e göre zaman kayıtları
export const getTimeLogsByIntern = async (
  internId: number
): Promise<TimeLog[]> => {
  const response = await apiClient.get<TimeLog[]>(
    `/api/timelogs/intern/${internId}`
  );
  return response.data;
};

//  Göreve göre zaman kayıtları
export const getTimeLogsByAssignment = async (
  assignmentId: number
): Promise<TimeLog[]> => {
  const response = await apiClient.get<TimeLog[]>(
    `/api/timelogs/assignment/${assignmentId}`
  );
  return response.data;
};

//  Tarih aralığına göre zaman kayıtları
export const getTimeLogsByDateRange = async (
  internId: number,
  startDate: string,
  endDate: string
): Promise<TimeLog[]> => {
  const response = await apiClient.get<TimeLog[]>(
    `/api/timelogs/intern/${internId}/date-range`,
    {
      params: { startDate, endDate },
    }
  );
  return response.data;
};

//  Zaman kaydını güncelle
export const updateTimeLog = async (
  id: number,
  updates: Partial<Omit<TimeLog, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TimeLog> => {
  const response = await apiClient.put<TimeLog>(`/api/timelogs/${id}`, updates);
  return response.data;
};

//  Zaman kaydını sil
export const deleteTimeLog = async (id: number): Promise<void> => {
  await apiClient.delete(`/api/timelogs/${id}`);
};

//  Yardımcı fonksiyon: Dakikaları saat:dakika formatına çevir
export const formatMinutesToHours = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}`;
};

//  Yardımcı fonksiyon: Bugünün tarihini al
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};
