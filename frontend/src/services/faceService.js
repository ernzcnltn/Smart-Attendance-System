import api from './api';

const checkChallenge = async (image, challenge_id, student_uuid = null) => {
  const response = await api.post('/face/check-challenge', {
    image,
    challenge_id,
    student_uuid
  });
  return response.data;
};

export { checkChallenge };