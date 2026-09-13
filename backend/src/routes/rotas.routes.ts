import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase";
import axios from "axios";
import { otimizarSequencia, PontoRota } from "../services/osrm.service";
import {
  CriarEntregaInput,
  criarEntregaSchema,
  OtimizarRotaInput,
  otimizarRotaSchema,
  importarLoteSchema,
  ImportarLoteInput,
} from "../schemas/rotas.schema";
import { verificarToken } from "../middlewares/auth.middleware";

// ============================================================================
// Tipos e Funções Auxiliares (mantidos intactos)
// ============================================================================

interface ParadaFormatada {
  id: string;
  ordem: number;
  rua: string;
  bairro: string;
  horarioEstimado: string;
  lat: number;
  lon: number;
  telefone?: string;
  nomeDestinatario?: string;
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
  telefone?: string;
  nome_destinatario?: string;
  referencia?: string;
  updated_at?: string;
  entregador_id?: string;
}

function calcularResumoReal(totalEntregas: number, distanciaMetros: number = 0, duracaoSegundos: number = 0): ResumoRota {
  const distanciaKm = distanciaMetros === 0 ? 0 : Number((distanciaMetros / 1000).toFixed(1));
  const tempoEstimadoMin = Math.round(duracaoSegundos / 60);
  const economiaEstimadaRs = Number((distanciaKm * 0.45).toFixed(2));
  return { totalEntregas, distanciaKm, tempoEstimadoMin, economiaEstimadaRs };
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
    telefone: item.telefone ?? (item as any).telefone ?? "",
    nomeDestinatario: item.nome_destinatario ?? (item as any).nomeDestinatario ?? "",
  }));
}

async function geocodificarNoCadastro(
  rua: string,
  numero?: string,
  bairro?: string,
  cidade?: string,
  cep?: string,
): Promise<{ lat: number; lon: number }> {
  try {
    const cepLimpo = cep?.replace(/\D/g, "");
    let ruaOficial = rua;
    let bairroOficial = bairro;
    let cidadeOficial = cidade;

    if (cepLimpo && cepLimpo.length === 8) {
      try {
        const { data: brasilApiData } = await axios.get(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`, {
          timeout: 3000,
        });
        if (brasilApiData) {
          if (brasilApiData.street) ruaOficial = brasilApiData.street;
          if (brasilApiData.neighborhood) bairroOficial = brasilApiData.neighborhood;
          if (brasilApiData.city) cidadeOficial = brasilApiData.city;

          const latCoords = brasilApiData.location?.coordinates?.latitude;
          const lonCoords = brasilApiData.location?.coordinates?.longitude;
          if (latCoords && lonCoords && !isNaN(Number(latCoords)) && !isNaN(Number(lonCoords)) && Number(latCoords) !== 0) {
            return { lat: parseFloat(latCoords), lon: parseFloat(lonCoords) };
          }
        }
      } catch {}

      try {
        const { data: cepData } = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { postalcode: cepLimpo, countrycodes: "br", format: "json", limit: 1 },
          headers: { "User-Agent": "DeliveryFastApp/1.0" },
          timeout: 3500,
        });
        if (cepData && cepData.length > 0) {
          return { lat: parseFloat(cepData[0].lat), lon: parseFloat(cepData[0].lon) };
        }
      } catch {}
    }

    const buscaCompleta = `${ruaOficial}${numero ? `, ${numero}` : ""}${bairroOficial ? ` - ${bairroOficial}` : ""}${cidadeOficial ? `, ${cidadeOficial}` : ""}, Brasil`;
    let { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: buscaCompleta, format: "json", limit: 1, countrycodes: "br" },
      headers: { "User-Agent": "DeliveryFastApp/1.0" },
      timeout: 3500,
    });
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };

    if (cidadeOficial) {
      const buscaSimples = `${ruaOficial}, ${cidadeOficial}, Brasil`;
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: buscaSimples, format: "json", limit: 1, countrycodes: "br" },
        headers: { "User-Agent": "DeliveryFastApp/1.0" },
        timeout: 3500,
      });
      if (res.data?.[0]) return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
    }
  } catch {}
  return { lat: 0, lon: 0 };
}

// ============================================================================
// Handlers Autenticados
// ============================================================================

async function criarEntregaHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const validacao = criarEntregaSchema.safeParse(request.body);

  if (!validacao.success) {
    return reply.status(400).send({ sucesso: false, erro: validacao.error.issues[0]?.message || "Dados inválidos." });
  }

  const body: CriarEntregaInput = validacao.data;

  try {
    const enderecoFormatado =
      body.endereco ||
      `${body.rua}${body.numero ? `, ${body.numero}` : ""}${body.bairro ? ` - ${body.bairro}` : ""}${body.cidade ? `, ${body.cidade}` : ""}${body.cep ? ` - CEP: ${body.cep}` : ""}`;
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    const coords = await geocodificarNoCadastro(body.rua, body.numero, body.bairro, body.cidade, body.cep);

    const { data, error } = await supabase
      .from("entregas")
      .insert([
        {
          rua: enderecoFormatado,
          bairro: body.bairro || body.cidade || "",
          horario_estimado: horaAtual,
          lat: coords.lat,
          lon: coords.lon,
          nome_destinatario: body.nomeDestinatario || "",
          telefone: body.telefone || "",
          referencia: body.referencia || "",
          status: "pendente",
          entregador_id: userId, // Vincula ao usuário logado
        },
      ])
      .select()
      .single();

    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao salvar no banco de dados." });
    return reply.status(201).send({ sucesso: true, entrega: data });
  } catch (error) {
    return reply.status(500).send({ sucesso: false, erro: "Erro ao salvar no banco de dados." });
  }
}

async function importarLoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const validacao = importarLoteSchema.safeParse(request.body);

  if (!validacao.success) {
    return reply.status(400).send({ sucesso: false, erro: validacao.error.issues[0]?.message || "Lote inválido." });
  }

  const { entregas } = validacao.data;

  try {
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    // Geocodifica todas as entregas do lote em paralelo
    const entregasProcessadas = await Promise.all(
      entregas.map(async (item) => {
        const coords = await geocodificarNoCadastro(item.rua, item.numero, item.bairro, item.cidade, item.cep);
        const enderecoFormatado = `${item.rua}${item.numero ? `, ${item.numero}` : ""}${item.bairro ? ` - ${item.bairro}` : ""}${item.cidade ? `, ${item.cidade}` : ""}${item.cep ? ` - CEP: ${item.cep}` : ""}`;

        return {
          rua: enderecoFormatado,
          bairro: item.bairro || item.cidade || "",
          horario_estimado: horaAtual,
          lat: coords.lat,
          lon: coords.lon,
          nome_destinatario: item.nomeDestinatario || "",
          telefone: item.telefone || "",
          referencia: item.referencia || "",
          status: "pendente",
          entregador_id: userId,
        };
      }),
    );

    const { data, error } = await supabase.from("entregas").insert(entregasProcessadas).select();

    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao salvar o lote no banco de dados." });

    return reply.status(201).send({
      sucesso: true,
      mensagem: `${entregasProcessadas.length} entregas importadas com sucesso!`,
      total: entregasProcessadas.length,
      entregas: data,
    });
  } catch (error) {
    return reply.status(500).send({ sucesso: false, erro: "Falha ao processar lote de entregas." });
  }
}


async function listarRotaAtualHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const { lat, lon } = (request.query as { lat?: string; lon?: string }) || {};

  const { data: entregas, error } = await supabase
    .from("entregas")
    .select("*")
    .eq("entregador_id", userId)
    .or("status.neq.entregue,status.is.null")
    .order("ordem", { ascending: true });

  if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao consultar o banco." });

  const paradasFormatadas = formatarParadas((entregas as EntregaDB[]) || []);
  let distanciaMetros = 0;
  let duracaoSegundos = 0;

  const coordsPontos = paradasFormatadas
    .filter((p) => p.lat !== 0 && p.lon !== 0 && !isNaN(p.lat) && !isNaN(p.lon))
    .map((p) => `${p.lon},${p.lat}`);

  if (lat && lon && Number(lat) !== 0 && Number(lon) !== 0) {
    coordsPontos.unshift(`${lon},${lat}`);
  }

  if (coordsPontos.length >= 2) {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsPontos.join(";")}`;
      const response = await axios.get(osrmUrl, {
        params: { overview: "false" },
        headers: { "User-Agent": "DeliveryFastApp/1.0 (deliveryfast@contato.local)" },
        timeout: 5000,
      });

      if (response?.data?.routes?.[0]) {
        distanciaMetros = response.data.routes[0].distance;
        duracaoSegundos = response.data.routes[0].duration;
      }
    } catch (err) {}
  }

  return reply.status(200).send({
    paradas: paradasFormatadas,
    resumo: calcularResumoReal(paradasFormatadas.length, distanciaMetros, duracaoSegundos),
  });
}

async function otimizarRotaHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  try {
    const validacao = otimizarRotaSchema.safeParse(request.body || {});
    const { latUsuario, lonUsuario }: OtimizarRotaInput = validacao.success ? validacao.data : {};

    const { data: entregas, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("entregador_id", userId)
      .or("status.neq.entregue,status.is.null")
      .order("ordem", { ascending: true });

    if (error || !entregas || entregas.length === 0) {
      return reply.status(200).send({ sucesso: true, mensagem: "Sem entregas para otimizar." });
    }

    const entregasTipadas = entregas as EntregaDB[];
    const pontosEntrada: PontoRota[] = [];

    if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      pontosEntrada.push({ lat: latUsuario, lon: lonUsuario, enderecoOriginal: "Sua Localização (GPS)" });
    }

    entregasTipadas.forEach((e) => {
      pontosEntrada.push({ id: e.id, lat: e.lat ?? 0, lon: e.lon ?? 0, enderecoOriginal: e.rua });
    });

    const pontosOtimizados = await otimizarSequencia(pontosEntrada);

    let novaOrdem = 1;
    const updates: Promise<any>[] = [];

    for (const item of pontosOtimizados) {
      const entregaCorrespondente = entregasTipadas.find(
        (e) => (item.id && e.id === item.id) || e.rua === (item as any).endereco || e.rua === (item as any).enderecoOriginal,
      );
      if (entregaCorrespondente) {
        const ordemAtualizada = novaOrdem++;
        updates.push(
          supabase
            .from("entregas")
            .update({ ordem: ordemAtualizada })
            .eq("id", entregaCorrespondente.id)
            .eq("entregador_id", userId),
        );
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return reply.status(200).send({ sucesso: true, mensagem: "Rota otimizada com sucesso!" });
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Falha ao otimizar a rota.";
    return reply.status(500).send({ sucesso: false, erro: mensagem });
  }
}

async function historicoGeralHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const { periodo } = (request.query as { periodo?: string }) || {};

  let query = supabase
    .from("entregas")
    .select("*")
    .eq("entregador_id", userId)
    .eq("status", "entregue")
    .order("updated_at", { ascending: false });

  if (periodo === "hoje") {
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    query = query.gte("updated_at", inicioHoje.toISOString());
  }

  const { data: entregasConcluidas, error } = await query;
  if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao consultar o histórico" });

  const totalConcluidas = entregasConcluidas?.length || 0;
  let ultimaEntregaHora = "--:--";

  if (totalConcluidas > 0 && entregasConcluidas[0].updated_at) {
    const dataUltima = new Date(entregasConcluidas[0].updated_at);
    ultimaEntregaHora = dataUltima.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return reply.status(200).send({
    sucesso: true,
    entregas: entregasConcluidas || [],
    resumo: { totalConcluidas, ultimaEntregaHora },
  });
}

async function concluirTodasEntregasHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  try {
    const { idsConcluidos, itensConcluidos } = (request.body as {
      idsConcluidos?: string[];
      itensConcluidos?: { id: string; status?: string; motivoInsucesso?: string; recebidoPor?: string }[];
    }) || {};

    if (itensConcluidos && Array.isArray(itensConcluidos) && itensConcluidos.length > 0) {
      const updates = itensConcluidos.map((item) => {
        const updatePayload: Record<string, any> = {
          status: item.status || "entregue",
          updated_at: new Date().toISOString(),
        };
        if (item.motivoInsucesso) updatePayload.referencia = `Motivo: ${item.motivoInsucesso}`;
        if (item.recebidoPor) updatePayload.nome_destinatario = item.recebidoPor;
        return supabase.from("entregas").update(updatePayload).eq("id", item.id).eq("entregador_id", userId);
      });
      await Promise.all(updates);
      return reply.status(200).send({ sucesso: true, mensagem: "Entregas finalizadas com sucesso!" });
    }

    let query = supabase.from("entregas").update({ status: "entregue", updated_at: new Date().toISOString() }).eq("entregador_id", userId); // Trava de segurança

    if (idsConcluidos && Array.isArray(idsConcluidos) && idsConcluidos.length > 0) {
      query = query.in("id", idsConcluidos);
    } else {
      query = query.or("status.neq.entregue,status.is.null");
    }

    const { error } = await query;
    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao concluir entregas." });

    return reply.status(200).send({ sucesso: true, mensagem: "Entregas finalizadas com sucesso!" });
  } catch (error) {
    return reply.status(500).send({ sucesso: false, mensagem: "Erro ao processar requisição." });
  }
}

// ============================================================================
// Registro das Rotas
// ============================================================================

export async function rotasRoutes(app: FastifyInstance) {
  // Ativa a proteção globalmente para este escopo
  app.addHook("preHandler", verificarToken);

  app.post("/api/v1/entregas", criarEntregaHandler);
  app.post("/api/v1/entregas/lote", importarLoteHandler);
  app.get("/api/v1/rotas/atual", listarRotaAtualHandler);
  app.post("/api/v1/rotas/otimizar", otimizarRotaHandler);

  app.delete("/api/v1/entregas/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const { error } = await supabase.from("entregas").delete().eq("id", id).eq("entregador_id", userId);

    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao excluir." });
    return reply.status(200).send({ sucesso: true });
  });

  app.put(
    "/api/v1/entregas/:id",
    async (request: FastifyRequest<{ Params: { id: string }; Body: { rua: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const { rua } = request.body;
      const userId = (request as any).userId;

      if (!rua?.trim()) return reply.status(400).send({ sucesso: false, erro: "Endereço não pode estar vazio." });

      const { error } = await supabase.from("entregas").update({ rua }).eq("id", id).eq("entregador_id", userId);
      if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar." });
      return reply.status(200).send({ sucesso: true });
    },
  );

  app.put(
    "/api/v1/rotas/reordenar",
    async (request: FastifyRequest<{ Body: { paradas: { id: string; ordem: number }[] } }>, reply: FastifyReply) => {
      const { paradas } = request.body;
      const userId = (request as any).userId;

      try {
        const updates = paradas.map((item) =>
          supabase.from("entregas").update({ ordem: item.ordem }).eq("id", item.id).eq("entregador_id", userId),
        );
        await Promise.all(updates);
        return reply.status(200).send({ sucesso: true });
      } catch (error) {
        return reply.status(500).send({ sucesso: false, erro: "Erro ao reordenar." });
      }
    },
  );

  app.put(
    "/api/v1/entregas/:id/status",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: string; motivoInsucesso?: string; recebidoPor?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { id } = request.params;
      const { status, motivoInsucesso, recebidoPor } = request.body;
      const userId = (request as any).userId;

      const updateData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (motivoInsucesso) updateData.referencia = `Motivo: ${motivoInsucesso}`;
      if (recebidoPor) updateData.nome_destinatario = recebidoPor;

      const { error } = await supabase.from("entregas").update(updateData).eq("id", id).eq("entregador_id", userId);
      if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar status." });
      return reply.status(200).send({ sucesso: true });
    },
  );

  app.get("/api/v1/entregas/historico-hoje", historicoGeralHandler);
  app.put("/api/v1/rotas/concluir-todas", concluirTodasEntregasHandler);
}
