import axios from 'axios';

const FACE_SERVICE_URL = process.env.REACT_APP_FACE_SERVICE_URL || 'http://localhost:5001';

const checkChallenge = async (image, challenge_id) => {
  const response = await axios.post(`${FACE_SERVICE_URL}/check-challenge`, {
    image,
    challenge_id
  });
  return response.data;
};

export { checkChallenge };