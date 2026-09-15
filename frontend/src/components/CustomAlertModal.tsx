import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TipoAlerta = 'sucesso' | 'erro' | 'aviso' | 'info';

export interface AlertaBotao {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertModalProps {
  visivel: boolean;
  titulo: string;
  mensagem?: string;
  botoes?: AlertaBotao[];
  tipo?: TipoAlerta;
  onFechar: () => void;
}

export function deduzirTipo(titulo: string): TipoAlerta {
  const t = (titulo || '').toLowerCase();
  if (t.includes('erro') || t.includes('falha')) return 'erro';
  if (t.includes('sucesso') || t.includes('conclu') || t.includes('salv') || t.includes('otimiza')) return 'sucesso';
  if (t.includes('atenção') || t.includes('atencao') || t.includes('aviso') || t.includes('excluir') || t.includes('sair'))
    return 'aviso';
  return 'info';
}

export default function CustomAlertModal({
  visivel,
  titulo,
  mensagem,
  botoes,
  tipo,
  onFechar,
}: CustomAlertModalProps) {
  const tipoFinal = tipo || deduzirTipo(titulo);

  const listaBotoes: AlertaBotao[] =
    botoes && botoes.length > 0
      ? botoes
      : [{ text: 'OK', style: 'default', onPress: onFechar }];

  const renderIcone = () => {
    switch (tipoFinal) {
      case 'sucesso':
        return (
          <View className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-3">
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
          </View>
        );
      case 'erro':
        return (
          <View className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 items-center justify-center mb-3">
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
          </View>
        );
      case 'aviso':
        return (
          <View className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 items-center justify-center mb-3">
            <Ionicons name="warning" size={28} color="#f59e0b" />
          </View>
        );
      default:
        return (
          <View className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 items-center justify-center mb-3">
            <Ionicons name="information-circle" size={28} color="#38bdf8" />
          </View>
        );
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View className="flex-1 bg-black/75 justify-center items-center px-6">
        <View className="bg-[#152033] border border-[#22334f] rounded-2xl p-5 w-full max-w-sm items-center shadow-2xl">
          {renderIcone()}

          <Text className="text-white font-bold text-base text-center mb-1">{titulo}</Text>

          {mensagem ? <Text className="text-[#94a3b8] text-xs text-center leading-5 mb-5">{mensagem}</Text> : <View className="mb-4" />}

          <View className={`w-full ${listaBotoes.length > 1 ? 'flex-row gap-2' : ''}`}>
            {listaBotoes.map((botao, idx) => {
              const isCancel = botao.style === 'cancel';
              const isDestructive = botao.style === 'destructive';

              let btnBg = 'bg-[#22c55e] active:bg-emerald-600';
              let textCol = 'text-black font-bold';

              if (isCancel) {
                btnBg = 'bg-[#1e2e48] border border-[#22334f] active:bg-[#253959]';
                textCol = 'text-[#94a3b8] font-semibold';
              } else if (isDestructive) {
                btnBg = 'bg-red-500/20 border border-red-500/40 active:bg-red-500/30';
                textCol = 'text-red-400 font-bold';
              }

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={async () => {
                    onFechar();
                    if (botao.onPress) {
                      await botao.onPress();
                    }
                  }}
                  className={`flex-1 py-3 rounded-xl items-center justify-center ${btnBg}`}
                >
                  <Text className={`text-xs ${textCol}`}>{botao.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
