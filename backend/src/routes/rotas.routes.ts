import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { supabase, obterSupabaseClient } from "../services/supabase";
import axios from "axios";
import { otimizarSequencia, PontoRota, calcularDistanciaHaversineMetros } from "../services/osrm.service";
import {
  buscarSugestoesGoogle,
  obterDetalhesLugar,
  geocodificarTextoGoogle,
} from "../services/googlePlaces.service";
import {
  CriarEntregaInput,
  criarEntregaSchema,
  OtimizarRotaInput,
  otimizarRotaSchema,
  importarLoteSchema,
  ImportarLoteInput,
  atualizarStatusSchema,
  relatorioFechamentoSchema,
  concluirEntregasSchema,
  reordenarSchema,
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
  const ECONOMIA_POR_KM = Number(process.env.ECONOMIA_POR_KM) || 0.45;
  const economiaEstimadaRs = Number((distanciaKm * ECONOMIA_POR_KM).toFixed(2));
  return { totalEntregas, distanciaKm, tempoEstimadoMin, economiaEstimadaRs };
}


function calcularDistanciaRotaFallback(coords: { lat: number; lon: number }[]): { distanciaMetros: number; duracaoSegundos: number } {
  let distanciaMetros = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    if (p1 && p2) {
      distanciaMetros += calcularDistanciaHaversineMetros(p1.lat, p1.lon, p2.lat, p2.lon) * 1.35;
    }
  }
  const duracaoSegundos = Math.round(distanciaMetros / 6.94) + Math.max(0, coords.length - 1) * 180;
  return { distanciaMetros: Math.round(distanciaMetros), duracaoSegundos };
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

export function normalizarNomeRua(rua: string): string {
  let r = (rua || "").trim();
  // Expande abreviações comuns no trânsito e logradouros brasileiros
  r = r.replace(/\bmal\.?\s+/gi, "Marechal ");
  r = r.replace(/\bav\.?\s+/gi, "Avenida ");
  r = r.replace(/\br\.?\s+/gi, "Rua ");
  r = r.replace(/\bdr\.?\s+/gi, "Doutor ");
  r = r.replace(/\bdra\.?\s+/gi, "Doutora ");
  r = r.replace(/\bcel\.?\s+/gi, "Coronel ");
  r = r.replace(/\bpres\.?\s+/gi, "Presidente ");
  r = r.replace(/\bprof\.?\s+/gi, "Professor ");
  r = r.replace(/\brod\.?\s+/gi, "Rodovia ");
  r = r.replace(/\bpç\.?\s+/gi, "Praça ");
  r = r.replace(/\bpca\.?\s+/gi, "Praça ");
  r = r.replace(/\bgen\.?\s+/gi, "General ");
  r = r.replace(/\bsgt\.?\s+/gi, "Sargento ");
  r = r.replace(/\bten\.?\s+/gi, "Tenente ");

  // Variações e correções fonéticas locais comuns
  r = r.replace(/\bmarques do erval\b/gi, "Marquês do Herval");
  r = r.replace(/\berval\b/gi, "Herval");

  return r.trim();
}

async function geocodificarNoCadastro(
  rua: string,
  numero?: string,
  bairro?: string,
  cidade?: string,
  cep?: string,
  latUsuario?: number,
  lonUsuario?: number,
): Promise<{ lat: number; lon: number }> {
  try {
    const ruaNormalizada = normalizarNomeRua(rua);
    const ruaLimpa = ruaNormalizada.replace(/[.,;]+$/, "").trim();
    const numeroLimpo = (numero || "").replace(/[.,;]+$/, "").trim();
    const bairroLimpo = (bairro || "").replace(/[.,;]+$/, "").trim();
    const cidadeLimpa = (cidade || "").replace(/[.,;]+$/, "").trim();
    const cepLimpo = cep?.replace(/\D/g, "");

    let ruaOficial = ruaLimpa;
    let bairroOficial = bairroLimpo;
    let cidadeOficial = cidadeLimpa;

    // Suporte a Plus Codes (Open Location Codes, ex: PQ56+QJ)
    const plusCodeMatch = ruaLimpa.match(/[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}/i);
    if (plusCodeMatch) {
      try {
        const queryCode = `${plusCodeMatch[0]}${cidadeOficial ? `, ${cidadeOficial}` : ""}, Brasil`;
        const resCode = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: queryCode, format: "json", limit: 1, countrycodes: "br" },
          headers: { "User-Agent": "DeliveryFastApp/1.0" },
          timeout: 2500,
        });
        if (resCode.data?.[0]) {
          return { lat: parseFloat(resCode.data[0].lat), lon: parseFloat(resCode.data[0].lon) };
        }
      } catch {}
    }

    // Se houver CEP de 8 dígitos, consulta BrasilAPI / CEP
    if (cepLimpo && cepLimpo.length === 8) {
      try {
        const { data: brasilApiData } = await axios.get(`https://brasilapi.com.br/api/cep/v2/${cepLimpo}`, {
          timeout: 2500,
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
          timeout: 2500,
        });
        if (cepData && cepData.length > 0) {
          return { lat: parseFloat(cepData[0].lat), lon: parseFloat(cepData[0].lon) };
        }
      } catch {}
    }

    // Delimitação por viewbox se o entregador enviou coordenadas de GPS
    let viewboxParam: string | undefined;
    if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      viewboxParam = `${lonUsuario - 0.45},${latUsuario + 0.45},${lonUsuario + 0.45},${latUsuario - 0.45}`;
    }

    // 0. Prioridade Máxima: Google Places (New) com Viés de GPS
    const buscaGoogle = `${ruaOficial}${numeroLimpo ? `, ${numeroLimpo}` : ""}${bairroOficial ? ` - ${bairroOficial}` : ""}${cidadeOficial ? `, ${cidadeOficial}` : ""}`;
    try {
      const googleRes = await geocodificarTextoGoogle(buscaGoogle, latUsuario, lonUsuario);
      if (googleRes && googleRes.lat !== 0 && googleRes.lon !== 0) {
        return { lat: googleRes.lat, lon: googleRes.lon };
      }
    } catch {}

    // 1. Tentativa estruturada no Nominatim (alta precisão com cidade/rua)
    if (cidadeOficial) {
      try {
        const paramsEstruturado: Record<string, any> = {
          street: `${numeroLimpo ? `${numeroLimpo} ` : ""}${ruaOficial}`,
          city: cidadeOficial,
          country: "Brazil",
          countrycodes: "br",
          format: "json",
          limit: 1,
        };
        if (viewboxParam) {
          paramsEstruturado.viewbox = viewboxParam;
          paramsEstruturado.bounded = 0;
        }

        const resEstruturado = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: paramsEstruturado,
          headers: { "User-Agent": "DeliveryFastApp/1.0" },
          timeout: 3000,
        });
        if (resEstruturado.data?.[0]) {
          return { lat: parseFloat(resEstruturado.data[0].lat), lon: parseFloat(resEstruturado.data[0].lon) };
        }
      } catch {}

      // 1b. Fallback estruturado SEM número (no Brasil, >95% dos números de porta não estão mapeados no OSM)
      if (numeroLimpo) {
        try {
          const paramsSemNumero: Record<string, any> = {
            street: ruaOficial,
            city: cidadeOficial,
            country: "Brazil",
            countrycodes: "br",
            format: "json",
            limit: 1,
          };
          if (viewboxParam) {
            paramsSemNumero.viewbox = viewboxParam;
            paramsSemNumero.bounded = 0;
          }

          const resSemNumero = await axios.get("https://nominatim.openstreetmap.org/search", {
            params: paramsSemNumero,
            headers: { "User-Agent": "DeliveryFastApp/1.0" },
            timeout: 2500,
          });
          if (resSemNumero.data?.[0]) {
            return { lat: parseFloat(resSemNumero.data[0].lat), lon: parseFloat(resSemNumero.data[0].lon) };
          }
        } catch {}
      }
    }

    // 2. Tentativa com string completa higienizada
    const buscaCompleta = `${ruaOficial}${numeroLimpo ? `, ${numeroLimpo}` : ""}${bairroOficial ? ` - ${bairroOficial}` : ""}${cidadeOficial ? `, ${cidadeOficial}` : ""}, Brasil`;
    try {
      const paramsNominatim: Record<string, any> = {
        q: buscaCompleta,
        format: "json",
        limit: 1,
        countrycodes: "br",
      };
      if (viewboxParam) {
        paramsNominatim.viewbox = viewboxParam;
        paramsNominatim.bounded = 0;
      }

      const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: paramsNominatim,
        headers: { "User-Agent": "DeliveryFastApp/1.0" },
        timeout: 3000,
      });
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch {}

    // 3. Tentativa mais tolerante: apenas rua + cidade
    if (cidadeOficial) {
      try {
        const buscaSimples = `${ruaOficial}, ${cidadeOficial}, Brasil`;
        const res = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: { q: buscaSimples, format: "json", limit: 1, countrycodes: "br" },
          headers: { "User-Agent": "DeliveryFastApp/1.0" },
          timeout: 3000,
        });
        if (res.data?.[0]) {
          return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
        }
      } catch {}
    }

    // 4. Tentativa delimitada por viewbox do entregador (caso a cidade tenha variação de grafia no OSM)
    if (viewboxParam && ruaOficial) {
      try {
        const resViewbox = await axios.get("https://nominatim.openstreetmap.org/search", {
          params: {
            q: `${ruaOficial}, Brasil`,
            format: "json",
            limit: 1,
            countrycodes: "br",
            viewbox: viewboxParam,
            bounded: 1,
          },
          headers: { "User-Agent": "DeliveryFastApp/1.0" },
          timeout: 2500,
        });
        if (resViewbox.data?.[0]) {
          return { lat: parseFloat(resViewbox.data[0].lat), lon: parseFloat(resViewbox.data[0].lon) };
        }
      } catch {}
    }
  } catch {}
  return { lat: 0, lon: 0 };
}

// ============================================================================
// Handlers Autenticados
// ============================================================================

function getDB(request?: FastifyRequest) {
  const token = (request as any)?.token || (request as any)?.headers?.authorization;
  return obterSupabaseClient(token);
}

async function obterProximaOrdem(userId: string, db = supabase): Promise<number> {
  const { data: ultimas } = await db
    .from("entregas")
    .select("ordem")
    .eq("entregador_id", userId)
    .or("status.neq.entregue,status.is.null")
    .order("ordem", { ascending: false });
  return (ultimas?.[0]?.ordem ?? 0) + 1;
}

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
    const coords =
      body.lat && body.lon && body.lat !== 0 && body.lon !== 0
        ? { lat: body.lat, lon: body.lon }
        : await geocodificarNoCadastro(body.rua, body.numero, body.bairro, body.cidade, body.cep, body.latUsuario, body.lonUsuario);

    const db = getDB(request);

    // Calcula a próxima ordem sequencial para a nova entrega
    const proximaOrdem = await obterProximaOrdem(userId, db);

    const { data, error } = await db
      .from("entregas")
      .insert([
        {
          ordem: proximaOrdem,
          rua: enderecoFormatado,
          bairro: body.bairro || body.cidade || "",
          horario_estimado: horaAtual,
          lat: coords.lat,
          lon: coords.lon,
          nome_destinatario: body.nomeDestinatario || "",
          telefone: body.telefone || "",
          referencia: body.referencia || "",
          status: "pendente",
          entregador_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ [Supabase Error - criarEntrega]:", error);
      return reply.status(500).send({ sucesso: false, erro: error.message || "Erro ao salvar no banco de dados." });
    }
    return reply.status(201).send({ sucesso: true, entrega: data });
  } catch (error: any) {
    console.error("❌ [Catch Error - criarEntrega]:", error);
    return reply.status(500).send({ sucesso: false, erro: error?.message || "Erro ao salvar no banco de dados." });
  }
}

async function importarLoteHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const validacao = importarLoteSchema.safeParse(request.body);

  if (!validacao.success) {
    return reply.status(400).send({ sucesso: false, erro: validacao.error.issues[0]?.message || "Lote inválido." });
  }

  const { entregas, cidadePadrao, latUsuario, lonUsuario } = validacao.data as ImportarLoteInput & {
    cidadePadrao?: string;
    latUsuario?: number;
    lonUsuario?: number;
  };

  try {
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;

    const db = getDB(request);

    // Busca a ordem mais alta atual para sequenciar o lote a partir dela
    let proximaOrdem = await obterProximaOrdem(userId, db);

    const entregasProcessadas: any[] = [];
    for (let i = 0; i < entregas.length; i++) {
      const item = entregas[i];
      if (!item) continue;
      const cidadeFinal = item.cidade || cidadePadrao || "";
      const coords = await geocodificarNoCadastro(
        item.rua,
        item.numero,
        item.bairro,
        cidadeFinal,
        item.cep,
        latUsuario,
        lonUsuario,
      );
      const enderecoFormatado = `${item.rua}${item.numero ? `, ${item.numero}` : ""}${item.bairro ? ` - ${item.bairro}` : ""}${cidadeFinal ? `, ${cidadeFinal}` : ""}${item.cep ? ` - CEP: ${item.cep}` : ""}`;

      entregasProcessadas.push({
        ordem: proximaOrdem++,
        rua: enderecoFormatado,
        bairro: item.bairro || cidadeFinal || "",
        horario_estimado: horaAtual,
        lat: coords.lat,
        lon: coords.lon,
        nome_destinatario: item.nomeDestinatario || "",
        telefone: item.telefone || "",
        referencia: item.referencia || "",
        status: "pendente",
        entregador_id: userId,
      });

      // Se houver mais itens, aguarda 200ms para evitar rate-limit de 429 no Nominatim
      if (i < entregas.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    const { data, error } = await db.from("entregas").insert(entregasProcessadas).select();

    if (error) {
      console.error("❌ [Supabase Error - importarLote]:", error);
      return reply.status(500).send({ sucesso: false, erro: error.message || "Erro ao salvar o lote no banco de dados." });
    }

    return reply.status(201).send({
      sucesso: true,
      mensagem: `${entregasProcessadas.length} entregas importadas com sucesso!`,
      total: entregasProcessadas.length,
      entregas: data,
    });
  } catch (error: any) {
    console.error("❌ [Catch Error - importarLote]:", error);
    return reply.status(500).send({ sucesso: false, erro: error?.message || "Falha ao processar lote de entregas." });
  }
}

async function listarRotaAtualHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const { lat, lon } = (request.query as { lat?: string; lon?: string }) || {};

  const db = getDB(request);

  const { data: entregas, error } = await db
    .from("entregas")
    .select("*")
    .eq("entregador_id", userId)
    .or("status.neq.entregue,status.is.null")
    .order("ordem", { ascending: true });

  if (error) {
    console.error("❌ [Supabase Error - listarRotaAtual]:", error);
    return reply.status(500).send({ sucesso: false, erro: error.message || "Erro ao consultar o banco." });
  }

  const paradasFormatadas = formatarParadas((entregas as EntregaDB[]) || []);

  // Auto-cura de coordenadas para entregas salvas sem geocodificação válida
  for (const item of paradasFormatadas) {
    if (item.lat === 0 || item.lon === 0) {
      geocodificarNoCadastro(item.rua, undefined, item.bairro, undefined, undefined, Number(lat), Number(lon))
        .then(async (novasCoords) => {
          if (novasCoords.lat !== 0 && novasCoords.lon !== 0) {
            item.lat = novasCoords.lat;
            item.lon = novasCoords.lon;
            await db
              .from("entregas")
              .update({ lat: novasCoords.lat, lon: novasCoords.lon })
              .eq("id", item.id)
              .eq("entregador_id", userId);
          }
        })
        .catch(() => {});
    }
  }

  let distanciaMetros = 0;
  let duracaoSegundos = 0;

  const coordsPontos = paradasFormatadas
    .filter((p) => p.lat !== 0 && p.lon !== 0 && !isNaN(p.lat) && !isNaN(p.lon))
    .map((p) => `${p.lon},${p.lat}`);

  if (lat && lon && Number(lat) !== 0 && Number(lon) !== 0) {
    coordsPontos.unshift(`${lon},${lat}`);
  }

  if (coordsPontos.length >= 2) {
    let obteveComOSRM = false;
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsPontos.join(";")}`;
      const response = await axios.get(osrmUrl, {
        params: { overview: "false" },
        headers: { "User-Agent": "DeliveryFastApp/1.0 (deliveryfast@contato.local)" },
        timeout: 2000,
      });

      if (response?.data?.routes?.[0]) {
        distanciaMetros = response.data.routes[0].distance;
        duracaoSegundos = response.data.routes[0].duration;
        obteveComOSRM = true;
      }
    } catch (err) {}

    // Fallback instantâneo via Haversine se o OSRM falhar ou demorar mais de 2s
    if (!obteveComOSRM) {
      const pontosParaFallback: { lat: number; lon: number }[] = [];
      if (lat && lon && Number(lat) !== 0 && Number(lon) !== 0) {
        pontosParaFallback.push({ lat: Number(lat), lon: Number(lon) });
      }
      paradasFormatadas.forEach((p) => {
        if (p.lat !== 0 && p.lon !== 0) {
          pontosParaFallback.push({ lat: p.lat, lon: p.lon });
        }
      });
      if (pontosParaFallback.length >= 2) {
        const fallback = calcularDistanciaRotaFallback(pontosParaFallback);
        distanciaMetros = fallback.distanciaMetros;
        duracaoSegundos = fallback.duracaoSegundos;
      }
    }
  }

  return reply.status(200).send({
    paradas: paradasFormatadas,
    resumo: calcularResumoReal(paradasFormatadas.length, distanciaMetros, duracaoSegundos),
    idParadaAtiva: paradasFormatadas[0]?.id || null,
    paradaAtiva: paradasFormatadas[0] || null,
  });
}

async function otimizarRotaHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  try {
    const validacao = otimizarRotaSchema.safeParse(request.body || {});
    const { latUsuario, lonUsuario, origemFixa, retornarABase }: OtimizarRotaInput = validacao.success
      ? validacao.data
      : {};

    const db = getDB(request);

    const { data: entregas, error } = await db
      .from("entregas")
      .select("*")
      .eq("entregador_id", userId)
      .or("status.neq.entregue,status.is.null")
      .order("ordem", { ascending: true });

    if (error || !entregas || entregas.length === 0) {
      return reply.status(200).send({ sucesso: true, mensagem: "Sem entregas para otimizar." });
    }

    const entregasTipadas = (entregas as EntregaDB[]).filter(
      (e) => e.status !== "entregue" && e.status !== "tentativa_falha",
    );

    if (entregasTipadas.length === 0) {
      return reply.status(200).send({ sucesso: true, mensagem: "Sem entregas para otimizar." });
    }

    const pontosEntrada: PontoRota[] = [];

    // Prioriza origemFixa (Hub/Galpão) se fornecido com coordenadas válidas; caso contrário usa latUsuario/lonUsuario (GPS ao vivo)
    if (origemFixa?.lat && origemFixa?.lon && origemFixa.lat !== 0 && origemFixa.lon !== 0) {
      pontosEntrada.push({
        lat: origemFixa.lat,
        lon: origemFixa.lon,
        enderecoOriginal: origemFixa.endereco || "Hub Central / Galpão",
      });
    } else if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      pontosEntrada.push({ lat: latUsuario, lon: lonUsuario, enderecoOriginal: "Sua Localização (GPS)" });
    }

    entregasTipadas.forEach((e) => {
      pontosEntrada.push({ id: e.id, lat: e.lat ?? 0, lon: e.lon ?? 0, enderecoOriginal: e.rua });
    });

    const pontosOtimizados = await otimizarSequencia(pontosEntrada, { retornarABase });

    let novaOrdem = 1;
    const updates: any[] = [];

    for (const item of pontosOtimizados) {
      const entregaCorrespondente = entregasTipadas.find(
        (e) => (item.id && e.id === item.id) || e.rua === (item as any).endereco || e.rua === (item as any).enderecoOriginal,
      );
      if (entregaCorrespondente) {
        const ordemAtualizada = novaOrdem++;
        updates.push(
          db
            .from("entregas")
            .update({ ordem: ordemAtualizada })
            .eq("id", entregaCorrespondente.id)
            .eq("entregador_id", userId)
            .select(),
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

  const db = getDB(request);

  let query = db
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
    const validacao = concluirEntregasSchema.safeParse(request.body || {});
    if (!validacao.success) {
      return reply.status(400).send({ sucesso: false, erro: "Dados inválidos." });
    }
    const { idsConcluidos, ids, itensConcluidos } = validacao.data;
    const listaIds = idsConcluidos || ids;

    const db = getDB(request);

    if (itensConcluidos && Array.isArray(itensConcluidos) && itensConcluidos.length > 0) {
      const updates = itensConcluidos.map((item) => {
        const updatePayload: Record<string, any> = {
          status: item.status || "entregue",
          updated_at: new Date().toISOString(),
        };
        if (item.motivoInsucesso) updatePayload.referencia = `Motivo: ${item.motivoInsucesso}`;
        if (item.recebidoPor) updatePayload.nome_destinatario = item.recebidoPor;
        return db.from("entregas").update(updatePayload).eq("id", item.id).eq("entregador_id", userId).select();
      });
      await Promise.all(updates);
      return reply.status(200).send({ sucesso: true, mensagem: "Entregas finalizadas com sucesso!" });
    }

    let query = db.from("entregas").update({ status: "entregue", updated_at: new Date().toISOString() }).eq("entregador_id", userId);

    if (listaIds && Array.isArray(listaIds) && listaIds.length > 0) {
      query = query.in("id", listaIds);
    } else {
      query = query.eq("status", "pendente");
    }

    const { error } = await query;
    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao concluir entregas." });

    return reply.status(200).send({ sucesso: true, mensagem: "Entregas finalizadas com sucesso!" });
  } catch (error) {
    return reply.status(500).send({ sucesso: false, erro: "Erro ao processar requisição." });
  }
}

// ============================================================================
// Registro das Rotas
// ============================================================================

export async function rotasRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verificarToken);

  app.post("/api/v1/entregas", criarEntregaHandler);
  app.post("/api/v1/entregas/lote", importarLoteHandler);
  app.get("/api/v1/rotas/atual", listarRotaAtualHandler);
  app.post("/api/v1/rotas/otimizar", otimizarRotaHandler);

  app.get("/api/v1/locais/autocomplete", async (request: FastifyRequest, reply: FastifyReply) => {
    const { q, lat, lon } = (request.query as { q?: string; lat?: string; lon?: string }) || {};
    if (!q || q.trim().length < 2) {
      return reply.status(200).send({ sugestoes: [] });
    }
    const latNum = lat && !isNaN(Number(lat)) ? Number(lat) : undefined;
    const lonNum = lon && !isNaN(Number(lon)) ? Number(lon) : undefined;
    const sugestoes = await buscarSugestoesGoogle(q, latNum, lonNum);
    return reply.status(200).send({ sugestoes });
  });

  app.get("/api/v1/locais/detalhes", async (request: FastifyRequest, reply: FastifyReply) => {
    const { placeId } = (request.query as { placeId?: string }) || {};
    if (!placeId) {
      return reply.status(400).send({ sucesso: false, erro: "placeId é obrigatório." });
    }
    const detalhes = await obterDetalhesLugar(placeId);
    if (!detalhes) {
      return reply.status(404).send({ sucesso: false, erro: "Local não encontrado." });
    }
    return reply.status(200).send({ sucesso: true, local: detalhes });
  });

  app.delete("/api/v1/entregas/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = (request as any).userId;
    const db = getDB(request);
    const { error } = await db.from("entregas").delete().eq("id", id).eq("entregador_id", userId);

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

      const db = getDB(request);
      const { error } = await db.from("entregas").update({ rua }).eq("id", id).eq("entregador_id", userId);
      if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar." });
      return reply.status(200).send({ sucesso: true });
    },
  );

  app.put(
    "/api/v1/rotas/reordenar",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const validacao = reordenarSchema.safeParse(request.body);
      if (!validacao.success) {
        return reply.status(400).send({ sucesso: false, erro: "Dados inválidos." });
      }
      const { paradas } = validacao.data;
      const userId = (request as any).userId;
      const db = getDB(request);

      try {
        const updates = paradas.map((item) =>
          db.from("entregas").update({ ordem: item.ordem }).eq("id", item.id).eq("entregador_id", userId).select(),
        );
        await Promise.all(updates);
        return reply.status(200).send({ sucesso: true });
      } catch (error) {
        return reply.status(500).send({ sucesso: false, erro: "Erro ao reordenar." });
      }
    },
  );

  app.put("/api/v1/entregas/:id/status", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const validacao = atualizarStatusSchema.safeParse(request.body);

    if (!validacao.success) {
      return reply.status(400).send({
        sucesso: false,
        erro: validacao.error.issues[0]?.message || "Status de entrega inválido.",
      });
    }

    const {
      status,
      motivoInsucesso,
      motivoFalha,
      observacao,
      moverParaFinal,
      recebidoPor,
      documentoRecebedor,
      fotoComprovante,
      assinaturaDigital,
    } = validacao.data;
    const userId = (request as any).userId;
    const db = getDB(request);

    const motivoReal = motivoFalha || motivoInsucesso;
    const observacaoReal = observacao;

    if (moverParaFinal) {
      const maiorOrdem = await obterProximaOrdem(userId, db);

      const notaRef = [
        motivoReal ? `Motivo insucesso: ${motivoReal}` : "",
        observacaoReal ? `Obs: ${observacaoReal}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const updateReord: Record<string, any> = {
        ordem: maiorOrdem,
        status: "pendente",
        updated_at: new Date().toISOString(),
      };
      if (notaRef) updateReord.referencia = notaRef;

      const { error: errReord } = await db
        .from("entregas")
        .update(updateReord)
        .eq("id", id)
        .eq("entregador_id", userId);

      if (errReord) return reply.status(500).send({ sucesso: false, erro: "Erro ao mover entrega para o final." });
      return reply.status(200).send({ sucesso: true, mensagem: "Entrega movida para o final do turno com sucesso!" });
    }

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (motivoReal || observacaoReal) {
      const notaRef = [
        motivoReal ? `Motivo: ${motivoReal}` : "",
        observacaoReal ? `Obs: ${observacaoReal}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      updateData.referencia = notaRef;
    }
    if (recebidoPor) updateData.nome_destinatario = recebidoPor;
    if (documentoRecebedor) updateData.documento_recebedor = documentoRecebedor;
    if (fotoComprovante) updateData.foto_comprovante = fotoComprovante;
    if (assinaturaDigital) updateData.assinatura_digital = assinaturaDigital;

    let { error } = await db.from("entregas").update(updateData).eq("id", id).eq("entregador_id", userId);

    if (error && (fotoComprovante || assinaturaDigital || documentoRecebedor)) {
      const dadosComprovante = {
        recebidoPor,
        documentoRecebedor,
        fotoComprovante,
        assinaturaDigital,
        motivoInsucesso,
      };
      const fallbackData: Record<string, any> = {
        status,
        updated_at: new Date().toISOString(),
        referencia: `Comprovante: ${JSON.stringify(dadosComprovante)}`,
      };
      if (recebidoPor) fallbackData.nome_destinatario = recebidoPor;
      const resFallback = await db.from("entregas").update(fallbackData).eq("id", id).eq("entregador_id", userId);
      error = resFallback.error;
    }

    if (error) return reply.status(500).send({ sucesso: false, erro: "Erro ao atualizar status." });
    return reply.status(200).send({ sucesso: true });
  });

async function relatorioFechamentoHandler(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request as any).userId;
  const db = getDB(request);
  const validacao = relatorioFechamentoSchema.safeParse(request.query || {});
  const { data: dataParam, taxaEntrega, valorKm, diaria } = validacao.success
    ? validacao.data
    : { data: undefined, taxaEntrega: 0, valorKm: 0, diaria: 0 };

  const targetDate = dataParam ? new Date(dataParam) : new Date();
  const dataInicio = new Date(targetDate);
  dataInicio.setHours(0, 0, 0, 0);
  const dataFim = new Date(targetDate);
  dataFim.setHours(23, 59, 59, 999);

  let inicioIso = dataInicio.toISOString();
  let fimIso = dataFim.toISOString();
  if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) {
    inicioIso = `${dataParam}T00:00:00.000Z`;
    fimIso = `${dataParam}T23:59:59.999Z`;
  }

  const { data: entregasDB, error } = await db
    .from("entregas")
    .select("*")
    .eq("entregador_id", userId)
    .gte("updated_at", inicioIso)
    .lte("updated_at", fimIso)
    .order("updated_at", { ascending: true });

  if (error) {
    return reply.status(500).send({ sucesso: false, erro: "Erro ao gerar o relatório de fechamento." });
  }

  const entregasFinalizadas = (entregasDB || []).filter(
    (e: EntregaDB) => e.status && e.status !== "pendente",
  );

  const entregues = entregasFinalizadas.filter((e: EntregaDB) => e.status === "entregue");
  const insucessos = entregasFinalizadas.filter((e: EntregaDB) =>
    ["ausente", "nao_localizado", "recusado"].includes(e.status || ""),
  );
  const totalParadas = entregues.length + insucessos.length;

  const coordsPontos: { lat: number; lon: number }[] = [];
  entregasFinalizadas.forEach((p: EntregaDB) => {
    if (p.lat && p.lon && !isNaN(p.lat) && !isNaN(p.lon) && p.lat !== 0 && p.lon !== 0) {
      coordsPontos.push({ lat: p.lat, lon: p.lon });
    }
  });

  let kmRodados = 0;
  if (coordsPontos.length >= 2) {
    const resFallback = calcularDistanciaRotaFallback(coordsPontos);
    kmRodados = Number((resFallback.distanciaMetros / 1000).toFixed(1));
  }

  let horaInicio = "--:--";
  let horaFim = "--:--";
  let duracaoMinutos = 0;

  if (entregasFinalizadas.length > 0 && entregasFinalizadas[0].updated_at) {
    const dInicio = new Date(entregasFinalizadas[0].updated_at);
    horaInicio = dInicio.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const ultimaEntrega = entregasFinalizadas[entregasFinalizadas.length - 1];
    const dFim = new Date(ultimaEntrega.updated_at || entregasFinalizadas[0].updated_at);
    horaFim = dFim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    duracaoMinutos = Math.max(0, Math.round((dFim.getTime() - dInicio.getTime()) / 60000));
  }

  const tempoMedioPorParada = totalParadas > 0 ? Math.round(duracaoMinutos / totalParadas) : 0;

  const ganhosEntregas = Number((entregues.length * taxaEntrega).toFixed(2));
  const ganhosKm = Number((kmRodados * valorKm).toFixed(2));
  const totalGanhos = Number((diaria + ganhosEntregas + ganhosKm).toFixed(2));

  const listaInsucessos = insucessos.map((item: EntregaDB) => {
    let motivo = item.status || "Insucesso";
    if (item.referencia) {
      if (item.referencia.startsWith("Motivo: ")) {
        motivo = item.referencia.replace("Motivo: ", "");
      } else if (item.referencia.includes("Comprovante:")) {
        try {
          const jsonParte = item.referencia.slice(item.referencia.indexOf("Comprovante:") + 12).trim();
          const parsed = JSON.parse(jsonParte);
          if (parsed.motivoInsucesso) motivo = parsed.motivoInsucesso;
        } catch {}
      }
    }
    return {
      id: item.id,
      rua: item.rua,
      bairro: item.bairro || "",
      destinatario: item.nome_destinatario || "",
      status: item.status,
      motivo,
    };
  });

  const dataReferencia = dataParam || new Date().toISOString().split("T")[0];

  return reply.status(200).send({
    sucesso: true,
    relatorio: {
      data: dataReferencia,
      totalParadas,
      totalEntregues: entregues.length,
      totalInsucessos: insucessos.length,
      kmRodados,
      horaInicio,
      horaFim,
      duracaoMinutos,
      tempoMedioPorParada,
      financeiro: {
        taxaEntrega,
        valorKm,
        diaria,
        ganhosEntregas,
        ganhosKm,
        totalGanhos,
      },
      insucessos: listaInsucessos,
    },
  });
}

  app.get("/api/v1/entregas/historico-hoje", historicoGeralHandler);
  app.get("/api/v1/relatorios/fechamento", relatorioFechamentoHandler);
  app.put("/api/v1/rotas/concluir-todas", concluirTodasEntregasHandler);
  app.put("/api/v1/rotas/finalizar", concluirTodasEntregasHandler);
}
