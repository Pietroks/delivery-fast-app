import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.204:3000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});
