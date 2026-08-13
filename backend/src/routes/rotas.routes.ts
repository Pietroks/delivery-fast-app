import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase } from "../services/supabase";
import axios from "axios";

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

function gerarResumoRota(totalEntregas: number): ResumoRota {
  return {
    totalEntregas,
    distanciaKm: Number((totalEntregas * 3.5).toFixed(1)),
    tempoEstimadoMin: totalEntregas * 10,
    economiaEstimadaRs: Number((totalEntregas * 2.2).toFixed(2)),
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

    const { data, error } = await supabase
      .from("entregas")
      .insert([
        {
          rua: enderecoFormatado,
          bairro: body.bairro || body.cidade || "Santo Ângelo, RS",
          horario_estimado: horaAtual,
          lat: 0,
          lon: 0,
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
  const resumo = gerarResumoRota(paradasFormatadas.length);

  return reply.status(200).send({
    paradas: paradasFormatadas,
    resumo,
  });
}

async function geocodificarEndereco(endereco: string): Promise<{ lat: number; lon: number }> {
  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: endereco,
        format: "json",
        limit: 1,
        countrycodes: "br",
      },
      headers: { "User-Agent": "DeliveryFastApp/1.0" },
    });

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
  } catch {
    // retorna 0,0 em caso de falha
  }
  return { lat: 0, lon: 0 };
}

async function otimizarRotaHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { latUsuario, lonUsuario } = request.body as {
      latUsuario?: number;
      lonUsuario?: number;
    };

    // 1. Busca entregas pendentes
    const { data: entregas, error } = await supabase
      .from("entregas")
      .select("*")
      .or("status.neq.entregue,status.is.null")
      .order("ordem", { ascending: true });

    if (error || !entregas || entregas.length === 0) {
      return reply.status(200).send({ sucesso: true, mensagem: "Sem entregas para otimizar." });
    }

    const entregasTipadas = entregas as EntregaDB[];

    // 2. Garante lat/lon via geocodificação para as entregas
    const entregasComCoords = await Promise.all(
      entregasTipadas.map(async (item) => {
        if (item.lat && item.lon && (item.lat !== 0 || item.lon !== 0)) {
          return item;
        }
        try {
          const coords = await geocodificarEndereco(item.rua);
          return { ...item, lat: coords.lat, lon: coords.lon };
        } catch {
          return { ...item, lat: 0, lon: 0 };
        }
      }),
    );

    const pontosValidos = entregasComCoords.filter((e) => e.lat !== 0 && e.lon !== 0);

    if (pontosValidos.length === 0) {
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Nenhum endereço válido encontrado para otimizar.",
      });
    }

    // 3. Monta lista de coordenadas (Ponto Inicial = Posição do Usuário)
    let coordsArray: string[] = [];
    const temLocalizacaoUsuario = latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0;

    if (temLocalizacaoUsuario) {
      coordsArray.push(`${lonUsuario},${latUsuario}`);
    }

    pontosValidos.forEach((e) => coordsArray.push(`${e.lon},${e.lat}`));

    if (coordsArray.length < 2) {
      return reply.status(200).send({
        sucesso: true,
        mensagem: "Endereço atualizado no mapa.",
      });
    }

    const coordsString = coordsArray.join(";");
    const osrmUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?source=first&roundtrip=false`;

    const { data: osrmData } = await axios.get(osrmUrl, { timeout: 5000 });

    if (osrmData && osrmData.code === "Ok" && osrmData.waypoints) {
      const waypoints = osrmData.waypoints as Array<{ waypoint_index: number }>;

      // Mapeia cada entrega associando-a à sua ordem calculada pelo OSRM
      const entregasComOrdem = pontosValidos.map((entrega, indexOriginal) => {
        // Se a localização do usuário foi incluída, o ponto correspondente à entrega no OSRM fica em indexOriginal + 1
        const indexOsrm = temLocalizacaoUsuario ? indexOriginal + 1 : indexOriginal;
        const ordemCalculada = waypoints[indexOsrm]?.waypoint_index ?? indexOriginal;

        return {
          entrega,
          ordemCalculada,
        };
      });

      // Ordena a lista do menor 'waypoint_index' para o maior
      entregasComOrdem.sort((a, b) => a.ordemCalculada - b.ordemCalculada);

      // 4. Salva no Supabase a nova ordem em sequência (1, 2, 3...)
      for (let i = 0; i < entregasComOrdem.length; i++) {
        const elemento = entregasComOrdem[i];
        if (elemento && elemento.entrega) {
          await supabase
            .from("entregas")
            .update({
              ordem: i + 1,
              lat: elemento.entrega.lat,
              lon: elemento.entrega.lon,
            })
            .eq("id", elemento.entrega.id);
        }
      }
    }

    return reply.status(200).send({ sucesso: true, mensagem: "Rota otimizada com sucesso!" });
  } catch (err: unknown) {
    const mensagem = err instanceof Error ? err.message : "Falha ao otimizar a rota.";
    return reply.status(200).send({ sucesso: false, erro: mensagem });
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
}
