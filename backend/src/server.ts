import fastify from "fastify";
import cors from "@fastify/cors";
import { rotasRoutes } from "./routes/rotas.routes";

const app = fastify({ logger: true });

// Habilita requisições do App React Native (CORS)
app.register(cors, { origin: "*" });

// Registra os endpoints da API
app.register(rotasRoutes);

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Servidor rodando na porta 3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
