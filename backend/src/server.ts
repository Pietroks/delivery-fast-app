import fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { rotasRoutes } from "./routes/rotas.routes";

dotenv.config();

const app = fastify({ logger: true });

// Habilita requisições do App React Native (CORS)
app.register(cors, { origin: "*" });

// Registra os endpoints da API
app.register(rotasRoutes);

// Prioriza a porta do ambiente (.env ou nuvem), com fallback padrão para 3000
const PORT = Number(process.env.PORT) || 3000;

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Servidor rodando na porta ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
