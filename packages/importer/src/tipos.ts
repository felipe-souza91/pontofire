/**
 * Tipos do importador (M5).
 *
 * Princípio: o parser NUNCA inventa. Quando não dá pra saber a direção
 * (entrada ou saída) ou a categoria, ele diz que não sabe e a tela de revisão
 * pergunta. Chute silencioso é o que faz o usuário perder confiança no número.
 */

/** O que o usuário declarou antes de subir o arquivo (tudo opcional). */
export type TipoDocumento = 'extrato' | 'fatura' | 'planilha';

/** Mesmo tipo fechado das transações do app (§ decisão). */
export type TipoLancamento = 'ativa' | 'passiva' | 'aporte' | 'saida';

export type FormatoData = 'dmy' | 'mdy' | 'ymd';

export interface ContextoImport {
  /** extrato bancário, fatura de cartão ou planilha própria */
  tipoDocumento?: TipoDocumento;
  /** só rotula o resultado; não muda o parsing */
  instituicao?: string;
  /** YYYY-MM — usado pra avisar quando o arquivo traz outro período */
  mesEsperado?: string;
  /** o usuário pode desempatar quando 03/04 é ambíguo */
  formatoData?: FormatoData;
  /**
   * Nome do usuário. Serve pra reconhecer transferência que ele fez PRA SI
   * MESMO em outra instituição — que não é receita nem despesa, e é a pista
   * de que falta importar o extrato do outro banco.
   */
  nomeUsuario?: string;
}

export type AlertaItem =
  | 'duplicata-arquivo' // aparece duas vezes no mesmo arquivo
  | 'duplicata-salva' // já existe no Ponto FIRE (reimportação)
  | 'transferencia' // pagamento de fatura, aplicação: contaria em dobro
  | 'fora-do-periodo' // mês diferente do que o usuário declarou
  | 'direcao-incerta' // o arquivo não disse se é entrada ou saída
  | 'transferencia-propria'; // dinheiro seu indo/vindo de outra conta sua

export interface ItemImportado {
  /** id estável dentro desta análise */
  id: string;
  /** YYYY-MM-DD */
  data: string;
  /** memo limpo, o que aparece na tela */
  descricao: string;
  /** exatamente o que veio no arquivo */
  descricaoOriginal: string;
  /** quem recebeu ou enviou, quando o arquivo informa (Bradesco) */
  contraparte?: string;
  /** SEMPRE positivo — a direção mora em `tipo` */
  valor: number;
  tipo: TipoLancamento;
  /** '' quando não deu pra saber — a revisão cobra */
  categoria: string;
  /** entra no salvamento? */
  incluir: boolean;
  /** de onde veio a classificação (mostrado como pista) */
  motivo?: string;
  alertas: AlertaItem[];
  /** identificador único do banco, quando o arquivo traz (OFX) */
  fitid?: string;
  /** impressão digital pra dedupe entre importações */
  impressao: string;
  /** chave do estabelecimento — agrupa iguais e alimenta a memória */
  chave: string;
}

export interface Diagnostico {
  formato: 'ofx' | 'csv';
  codificacao: string;
  linhasLidas: number;
  linhasIgnoradas: number;
  formatoData: string;
  separador?: string;
  /** papel → cabeçalho encontrado no arquivo */
  colunas?: Record<string, string>;
  periodo?: { inicio: string; fim: string };
  instituicao?: string;
  conta?: string;
  documentoDetectado?: TipoDocumento;
  /** true quando o arquivo não permitiu inferir entrada × saída */
  direcaoIncerta: boolean;
  /** quantas transferências do usuário pra ele mesmo apareceram */
  transferenciasProprias: number;
}

export interface ResultadoAnalise {
  itens: ItemImportado[];
  diagnostico: Diagnostico;
  /** frases pro usuário conferir antes de aprovar */
  avisos: string[];
}

/** Regra aprendida: "toda vez que vier UBER, é Transporte". */
export interface MemoriaCategoria {
  chave: string;
  categoria: string;
  tipo: TipoLancamento;
}

/** O que já está salvo no Ponto FIRE, pro dedupe entre importações. */
export interface JaSalvo {
  impressao?: string;
  fitid?: string;
}
