import api from '@/utils/apiClients';
import type { Intern } from '../types';

type ServerIntern = {
  id: number;
  name?: string;
  surname?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
};

export async function fetchMentorInterns(mentorId: number): Promise<Intern[]> {
  const { data } = await api.get<ServerIntern[]>(
    `/api/interns/mentor/${mentorId}`
  );
  return data.map(x => ({
    id: x.id,
    firstName: x.firstName ?? x.name ?? '',
    lastName: x.lastName ?? x.surname ?? '',
    email: x.email,
    department: x.department,
  }));
}
