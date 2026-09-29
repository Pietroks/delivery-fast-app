import axios from "axios";

export interface SugestaoLugar {
  id: string;
  descricao: string;
  principal: string;
  secundario: string;
}

export interface DetalhesLugar {
  id: string;
  lat: number;
  lon: number;
  enderecoFormatado: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export async function buscarSugestoesGoogle(
  input: string,
  latUsuario?: number,
  lonUsuario?: number,
): Promise<SugestaoLugar[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !input || input.trim().length < 2) {
    return [];
  }

  try {
    const payload: Record<string, any> = {
      input: input.trim(),
      includedRegionCodes: ["br"],
    };

    if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      payload.locationBias = {
        circle: {
          center: { latitude: latUsuario, longitude: lonUsuario },
          radius: 35000.0,
        },
      };
    }

    const response = await axios.post("https://places.googleapis.com/v1/places:autocomplete", payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      timeout: 3000,
    });

    const suggestions = response.data?.suggestions || [];
    return suggestions
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        id: s.placePrediction.placeId || s.placePrediction.place?.replace("places/", "") || "",
        descricao: s.placePrediction.text?.text || "",
        principal: s.placePrediction.structuredFormat?.mainText?.text || "",
        secundario: s.placePrediction.structuredFormat?.secondaryText?.text || "",
      }));
  } catch {
    return [];
  }
}

export async function obterDetalhesLugar(placeId: string): Promise<DetalhesLugar | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId) {
    return null;
  }

  try {
    const cleanId = placeId.startsWith("places/") ? placeId.replace("places/", "") : placeId;
    const url = `https://places.googleapis.com/v1/places/${cleanId}`;

    const response = await axios.get(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,location,formattedAddress,addressComponents",
      },
      timeout: 3000,
    });

    const data = response.data;
    if (!data?.location) return null;

    let rua = "";
    let numero = "";
    let bairro = "";
    let cidade = "";
    let estado = "";
    let cep = "";

    const components = data.addressComponents || [];
    for (const comp of components) {
      const types = comp.types || [];
      if (types.includes("route")) rua = comp.longText || comp.shortText || "";
      if (types.includes("street_number")) numero = comp.longText || comp.shortText || "";
      if (types.includes("sublocality_level_1") || types.includes("sublocality") || types.includes("neighborhood")) {
        bairro = comp.longText || comp.shortText || "";
      }
      if (types.includes("administrative_area_level_2")) cidade = comp.longText || comp.shortText || "";
      if (types.includes("administrative_area_level_1")) estado = comp.shortText || comp.longText || "";
      if (types.includes("postal_code")) cep = comp.longText || comp.shortText || "";
    }

    if (!rua && data.displayName?.text) {
      rua = data.displayName.text;
    }

    return {
      id: data.id || cleanId,
      lat: data.location.latitude,
      lon: data.location.longitude,
      enderecoFormatado: data.formattedAddress || "",
      rua,
      numero,
      bairro,
      cidade,
      estado,
      cep,
    };
  } catch {
    return null;
  }
}

export async function geocodificarTextoGoogle(
  texto: string,
  latUsuario?: number,
  lonUsuario?: number,
): Promise<{ lat: number; lon: number; enderecoFormatado?: string } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !texto || texto.trim().length < 3) {
    return null;
  }

  try {
    const payload: Record<string, any> = {
      textQuery: texto.trim(),
    };

    if (latUsuario && lonUsuario && latUsuario !== 0 && lonUsuario !== 0) {
      payload.locationBias = {
        circle: {
          center: { latitude: latUsuario, longitude: lonUsuario },
          radius: 35000.0,
        },
      };
    }

    const response = await axios.post("https://places.googleapis.com/v1/places:searchText", payload, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.formattedAddress,places.location",
      },
      timeout: 3000,
    });

    const place = response.data?.places?.[0];
    if (place?.location?.latitude && place?.location?.longitude) {
      return {
        lat: place.location.latitude,
        lon: place.location.longitude,
        enderecoFormatado: place.formattedAddress,
      };
    }
    return null;
  } catch {
    return null;
  }
}
