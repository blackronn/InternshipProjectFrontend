// src/services/apiClient.js or similar

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL,
});

export default apiClient;
