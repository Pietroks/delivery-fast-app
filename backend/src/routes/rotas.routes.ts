import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase";
import axios from "axios";
import { otimizarSequencia } from "../services/osrm.service";

// ============================================================================
// Tipos
// ============================================================================

interface ParadaFormatada {
  id: string;
  ordem: number;
  rua: string;
  bairro: string;
  horarioEstimado: string;
  lat: number;
  lon: number;
}

interface ResumoRota {
  totalEntregas: number;
  distanciaKm: number;
  tempoEstimadoMin: number;
  economiaEstimadaRs: number;
}

interface EntregaDB {
  id: string;
  ordem?: number;
  rua: string;
  bairro?: string;
  horario_estimado?: string;
  lat?: number;
  lon?: number;
  status?: string;
}

// ============================================================================
// Funções auxiliares
// ============================================================================

function calcularResumoReal(totalEntregas: number, distanciaMetros: number = 0, duracaoSegundos: number = 0): ResumoRota {
  const distanciaKm = Number((distanciaMetros / 1000).toFixed(1));
  const tempoEstimadoMin = Math.round(duracaoSegundos / 60);
  const economiaEstimadaRs = Number((distanciaKm * 0.45).toFixed(2));

  return {
    totalEntregas,
    distanciaKm,
    tempoEstimadoMin,
    economiaEstimadaRs,
  };
}

function formatarParadas(entregas: EntregaDB[]): ParadaFormatada[] {
  return entregas.map((item, index) => ({
    id: item.id,
    ordem: item.ordem ?? index + 1,
    rua: item.rua,
    bairro: item.bairro ?? "",
    horarioEstimado: item.horario_estimado ?? "",
    lat: item.lat ?? 0,
    lon: item.lon ?? 0,
  }));
}

async function geocodificarNoCadastro(enderecoCompleto: string): Promise<{ lat: number; lon: number }> {
  try {
    const cepMatch = enderecoCompleto.match(/CEP:?\s*(\d{5}-?\d{3}|\d{8})/i);
    let termoBusca = "";

    if (cepMatch && cepMatch[1]) {
      const cepLimpo = cepMatch[1].replace(/\D/g, "");
      termoBusca = `${cepLimpo}, Brasil`;
    } else {
      const enderecoSimplificado = enderecoCompleto.replace(/,\s*\d+/g, "").trim();
      termoBusca = `${enderecoSimplificado}, Brasil`;
    }

    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: termoBusca,
        format: "json",
        limit: 1,
        countrycodes: "br",
      },
      headers: { "User-Agent": "DeliveryFastApp/1.0" },
      timeout: 3000,
    });

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
  } catch {}
  return { lat: 0, lon: 0 };
}

// ============================================================================
// Handlers
// ============================================================================

async function criarEntregaHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as any;

    const enderecoFormatado =
      body.endereco || `${body.rua ?? ""}, ${body.numero ?? ""}${body.bairro ? ` - ${body.bairro}` : ""}, ${body.cidade ?? ""}`;

    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    const coords = await geocodificarNoCadastro(enderecoFormatado);

    const { data, error } = await supabase
      .from("entregas")
      .insert([
        {
          rua: enderecoFormatado,
          bairro: body.bairro || body.cidade || "",
          horario_estimado: horaAtual,
          lat: coords.lat,
          lon: coords.lon,
          nome_destinatario: body.nomeDestinatario,
          telefone: body.telefone,
          referencia: body.referencia,
          status: "pendente",
        },
      ])
      .select()
      .single();

    if (error) {
      request.log.error({ error }, "Erro ao salvar entrega no Supabase");
      return reply.status(500).send({ sucesso: false, erro: "Erro ao salvar no banco de dados." });
    }

    return reply.status(201).send({ sucesso: true, entrega: data });
  } catch (error: unknown) {
    const mensagem = error instanceof Error ? error.message : "Erro inesperado.";
    return reply.status(400).send({ sucesso: false, erro: mensagem });
  }
}

async function listarRotaAtualHandler(request: FastifyRequest, reply: FastifyReply) {
  const { data: entregas, error } = await supabase
    .from("entregas")
    .select("*")
    .or("status.neq.entregue,status.is.null")
    .order("ordem", { ascending: true });

  if (error) {
    request.log.error({ error }, "Erro ao buscar entregas");
    return reply.status(500).send({ sucesso: false, erro: "Erro ao consultar o banco." });
  }

  const paradasFormatadas = formatarParadas((entregas as EntregaDB[]) || []);

  let distanciaMetros = 0;
  let duracaoSegundos = 0;

  const coordsValidas = paradasFormatadas.filter((p) => p.lat !== 0 && p.lon !== 0).map((p) => `${p.lon},${p.lat}`);

  if (coordsValidas.length >= 2) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsValidas.join(";")}`;
      const { data } = await axios.get(osrmUrl, { timeout: 3000 });
      if (data?.routes?.[0]) {
        distanciaMetros = data.routes[0].distance;
        duracaoSegundos = data.routes[0].duration;
      }
    } catch {}
  }

  const resumo = calcularResumoReal(paradasFormatadas.length, distanciaMetros, duracaoSegundos);

  return reply.status(200).send({
    paradas: paradasFormatadas,
    resumo,
  });
}

async function otimizarRotaHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { latUsuario, lonUsuario } = request.body as {
      latUsuario?: number;
      lonUsuario?: number;
    };

    const { data: entregas, error } = await supabase
      .from("entregas")
      .select("*")
      .or("status.neq.entregue,status.is.null")
      .order("ordem", { ascending: true });

    if (error || !entregas || entregas.length === 0) {
      return reply.status(200).send({ sucesso: true, mensagem: "Sem entregas para otimizar." });
    }

    const entregasTipadas = entregas as EntregaDB[];

    // Otimização ultra-rápida lendo lat/lon direto do banco sem chamadas externas ao Nominatim
    const pontosEntrada = [];

    if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      pontosEntrada.push({ lat: latUsuario, lon: lonUsuario, enderecoOriginal: "Sua Localização (GPS)" });
    }

    entregasTipadas.forEach((e) => {
      pontosEntrada.push({
        lat: e.lat ?? 0,
        lon: e.lon ?? 0,
        enderecoOriginal: e.rua,
      });
    });

    const pontosOtimizados = await otimizarSequencia(pontosEntrada);

    let novaOrdem = 1;
    for (const item of pontosOtimizados) {
      const entregaCorrespondente = entregasTipadas.find((e) => e.rua === item.endereco);
      if (entregaCorrespondente) {
        await supabase.from("entregas").update({ ordem: novaOrdem }).eq("id", entregaCorrespondente.id);
        novaOrdem++;
      }
    }

    return reply.status(200).send({
      sucesso: true,
      mensagem: "Rota otimizada com sucesso!",
    });
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Falha ao otimizar a rota.";
    return reply.status(200).send({ sucesso: false, erro: mensagem });
  }
}

async function historicoGeralHandler(request: FastifyRequest, reply: FastifyReply) {
  const { periodo } = (request.query as { periodo?: string }) || {};

  let query = supabase.from("entregas").select("*").eq("status", "entregue").order("updated_at", { ascending: false });

  if (periodo === "hoje") {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    query = query.gte("updated_at", inicioHoje.toISOString());
  }

  const { data: entregasConcluidas, error } = await query;

  if (error) {
    return reply.status(500).send({ sucesso: false, erro: "Erro ao consultar o histórico" });
  }

  const totalConcluidas = entregasConcluidas?.length || 0;
  let ultimaEntregaHora = "--:--";

  if (totalConcluidas > 0 && entregasConcluidas[0].updated_at) {
    const dataUltima = new Date(entregasConcluidas[0].updated_at);
    ultimaEntregaHora = dataUltima.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return reply.status(200).send({
    sucesso: true,
    entregas: entregasConcluidas || [],
    resumo: {
      totalConcluidas,
      ultimaEntregaHora,
    },
  });
}

async function concluirTodasEntregasHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { error } = await supabase.from("entregas").update({ status: "entregue" }).or("status.neq.entregue,status.is.null");

    if (error) {
      request.log.error({ error }, "Erro ao concluir todas as entregas.");
      return reply.status(500).send({ sucesso: false, erro: "Erro ao concluir entregas." });
    }

    return reply.status(200).send({ sucesso: true, mensagem: "Todas as entregas foram concluídas!" });
  } catch (error) {
    return reply.status(500).send({ sucesso: false, mensagem: "Erro ao processar requisição." });
  }
}

// ============================================================================
// Registro das Rotas
// ============================================================================

export async function rotasRoutes(app: FastifyInstance) {
  app.post("/api/v1/entregas", criarEntregaHandler);
  app.get("/api/v1/rotas/atual", listarRotaAtualHandler);
  app.post("/api/v1/rotas/otimizar", otimizarRotaHandler);

  app.delete("/api/v1/entregas/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { error } = await supabase.from("entregas").delete().eq("id", id);

    if (error) {
      request.log.error({ error }, "Erro ao excluir entrega");
      return reply.status(500).send({ sucesso: false, erro: "Erro ao excluir." });
    }
    return reply.status(200).send({ sucesso: true });
  });

  app.put(
    "/api/v1/entregas/:id",
    async (request: FastifyRequest<{ Params: { id: string }; Body: { rua: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { rua } = request.body;

      if (!rua?.trim()) {
        return reply.status(400).send({ sucesso: false, erro: "Endereço não pode estar vazio." });
      }

      const { error } = await supabase.from("entregas").update({ rua }).eq("id", id);

      if (error) {
        request.log.error({ error }, "Erro ao atualizar entrega");
        return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar." });
      }
      return reply.status(200).send({ sucesso: true });
    },
  );

  app.put(
    "/api/v1/rotas/reordenar",
    async (request: FastifyRequest<{ Body: { paradas: { id: string; ordem: number }[] } }>, reply: FastifyReply) => {
      const { paradas } = request.body;

      try {
        for (const item of paradas) {
          await supabase.from("entregas").update({ ordem: item.ordem }).eq("id", item.id);
        }
        return reply.status(200).send({ sucesso: true });
      } catch (error) {
        request.log.error({ error }, "Erro ao reordenar entregas");
        return reply.status(500).send({ sucesso: false, erro: "Erro ao reordenar." });
      }
    },
  );

  app.put(
    "/api/v1/entregas/:id/status",
    async (request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { status } = request.body;

      const { error } = await supabase.from("entregas").update({ status }).eq("id", id);

      if (error) {
        request.log.error({ error }, "Erro ao atualizar status");
        return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar status." });
      }
      return reply.status(200).send({ sucesso: true });
    },
  );

  app.get("/api/v1/entregas/historico-hoje", historicoGeralHandler);
  app.put("/api/v1/rotas/concluir-todas", concluirTodasEntregasHandler);
}
