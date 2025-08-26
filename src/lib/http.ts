import axios from 'axios';

const http = axios.create({
  baseURL: '/api', // vue.config.js proxy'si buna bakıyor
  timeout: 10000,
});

http.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token'); // varsa ekle
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
