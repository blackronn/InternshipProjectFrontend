import api from '@/utils/apiClients';

export type EvaluationCreateRequest = {
  mentorId: number;
  internId: number;
  communicationRating: number;
  teamworkRating: number;
  problemSolvingRating: number;
  responsibilityRating: number;
  comment?: string;
};

export type EvaluationUpdateRequest = {
  communicationRating: number;
  teamworkRating: number;
  problemSolvingRating: number;
  responsibilityRating: number;
  comment?: string;
  requestingMentorId?: number;
};

export type EvaluationResponse = {
  id: number;
  mentorId: number;
  internId: number;
  communicationRating: number;
  teamworkRating: number;
  problemSolvingRating: number;
  responsibilityRating: number;
  comment?: string;
  score?: number;
};

export async function createEvaluation(input: EvaluationCreateRequest) {
  const { data, status } = await api.post<EvaluationResponse>(
    '/api/evaluations',
    input
  );
  if (status !== 200 && status !== 201)
    throw new Error(`Unexpected status: ${status}`);
  return data;
}

export async function getEvaluationByMentorAndIntern(
  mentorId: number,
  internId: number
) {
  try {
    // Backend: GET /api/evaluations/by-mentor-intern?mentorId=&internId=
    const { data } = await api.get<EvaluationResponse>(
      '/api/evaluations/by-mentor-intern',
      { params: { mentorId, internId } } // axios params ile temiz
    );
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export async function updateEvaluation(
  evaluationId: number,
  body: EvaluationUpdateRequest,
  requestingMentorId?: number
) {
  const config = requestingMentorId
    ? { params: { requestingMentorId } }
    : undefined;

  const { data } = await api.put(
    `/api/evaluations/${evaluationId}`,
    body,
    config
  );
  return data;
}
