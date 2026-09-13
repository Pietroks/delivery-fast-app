import { parseLinhasParaEntregas } from "../ImportarLoteModal";

describe("Componente: ImportarLoteModal (Parser de Linhas)", () => {
  test("Deve retornar array vazio se o texto estiver vazio ou apenas espaços", () => {
    expect(parseLinhasParaEntregas("")).toEqual([]);
    expect(parseLinhasParaEntregas("   \n   \n")).toEqual([]);
  });

  test("Deve ignorar linhas de comentário e linhas muito curtas", () => {
    const texto = `# Lista de entregas\n// Comentario\na\nRua das Flores, 100`;
    const resultado = parseLinhasParaEntregas(texto);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].rua).toBe("Rua das Flores");
    expect(resultado[0].numero).toBe("100");
  });

  test("Deve extrair rua, número, bairro, nome e telefone corretamente", () => {
    const texto = `Rua XV de Novembro, 1500 - Bairro Centro - Carlos Silva - 55999887766\nAv Brasil, 450 - Maria Souza`;
    const resultado = parseLinhasParaEntregas(texto);

    expect(resultado).toHaveLength(2);

    expect(resultado[0].rua).toBe("Rua XV de Novembro");
    expect(resultado[0].numero).toBe("1500");
    expect(resultado[0].bairro).toBe("Centro");
    expect(resultado[0].nomeDestinatario).toBe("Carlos Silva");
    expect(resultado[0].telefone).toBe("55999887766");

    expect(resultado[1].rua).toBe("Av Brasil");
    expect(resultado[1].numero).toBe("450");
    expect(resultado[1].nomeDestinatario).toBe("Maria Souza");
  });
});
