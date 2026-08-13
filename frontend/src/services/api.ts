import axios from "axios";

const IP_DA_SUA_MAQUINA = "192.168.1.204";

export const api = axios.create({
  baseURL: `http://${IP_DA_SUA_MAQUINA}:3000/api/v1`,
});
