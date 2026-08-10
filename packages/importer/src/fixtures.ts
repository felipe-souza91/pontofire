/**
 * Fixtures anonimizadas, no formato que os bancos brasileiros realmente
 * exportam — inclusive as feiúras: lixo antes do cabeçalho, ponto e vírgula,
 * Windows-1252, colunas separadas de crédito/débito, data ambígua.
 *
 * Usadas só nos testes.
 */

/** Extrato OFX 1.x (SGML, tags sem fechamento) — padrão Itaú/Bradesco/BB. */
export const OFX_EXTRATO = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20260901100000[-3:BRT]
<LANGUAGE>POR
<FI><ORG>Banco Exemplo S.A.<FID>341</FI>
</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM><BANKID>341<ACCTID>12345-6<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260801000000[-3:BRT]
<DTEND>20260831235959[-3:BRT]
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260805120000[-3:BRT]<TRNAMT>9500.00<FITID>A001<MEMO>CREDITO SALARIO EMPRESA XYZ</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260806120000[-3:BRT]<TRNAMT>-1800.00<FITID>A002<MEMO>ALUGUEL IMOBILIARIA CENTRO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260808120000[-3:BRT]<TRNAMT>-432.15<FITID>A003<MEMO>COMPRA CARTAO SUPERMERCADO BOM PRECO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260810120000[-3:BRT]<TRNAMT>-89.90<FITID>A004<MEMO>NETFLIX.COM</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260812120000[-3:BRT]<TRNAMT>-2450.00<FITID>A005<MEMO>PAGAMENTO DE FATURA CARTAO</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260815120000[-3:BRT]<TRNAMT>-3000.00<FITID>A006<MEMO>APLICACAO CDB LIQUIDEZ DIARIA</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260820120000[-3:BRT]<TRNAMT>318.44<FITID>A007<MEMO>RENDIMENTO CDB</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260822120000[-3:BRT]<TRNAMT>-45.90<FITID>A008<MEMO>UBER *TRIP 8H2K9</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260824120000[-3:BRT]<TRNAMT>-52.30<FITID>A009<MEMO>UBER *TRIP 91XYZ</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260828120000[-3:BRT]<TRNAMT>-38.00<FITID>A010<MEMO>TARIFA CESTA DE SERVICOS</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL><BALAMT>4210.19<DTASOF>20260831235959[-3:BRT]</LEDGERBAL>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

/** Fatura OFX 2.x (XML, tags fechadas) — compras com valor NEGATIVO. */
export const OFX_FATURA = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>
<OFX>
  <CREDITCARDMSGSRSV1>
    <CCSTMTTRNRS>
      <CCSTMTRS>
        <CURDEF>BRL</CURDEF>
        <CCACCTFROM><ACCTID>************1234</ACCTID></CCACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20260801000000</DTSTART>
          <DTEND>20260831000000</DTEND>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260803000000</DTPOSTED>
            <TRNAMT>-78.40</TRNAMT><FITID>C001</FITID><MEMO>IFOOD *IFOOD</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260807000000</DTPOSTED>
            <TRNAMT>-249.90</TRNAMT><FITID>C002</FITID><MEMO>DROGARIA PACHECO</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE><DTPOSTED>20260809000000</DTPOSTED>
            <TRNAMT>78.40</TRNAMT><FITID>C003</FITID><MEMO>ESTORNO IFOOD *IFOOD</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260814000000</DTPOSTED>
            <TRNAMT>-1200.00</TRNAMT><FITID>C004</FITID><MEMO>LOJA DE MOVEIS PARCELA 03/10</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </CCSTMTRS>
    </CCSTMTTRNRS>
  </CREDITCARDMSGSRSV1>
</OFX>`;

/** Extrato CSV com vírgula e data DD/MM — layout tipo Nubank. */
export const CSV_EXTRATO_VIRGULA = `Data,Valor,Identificador,Descrição
05/08/2026,9500.00,6212a1e2-0001,Transferência recebida - EMPRESA XYZ LTDA
06/08/2026,-1800.00,6212a1e2-0002,Pagamento de boleto - IMOBILIARIA CENTRO
08/08/2026,-432.15,6212a1e2-0003,Compra no débito - SUPERMERCADO BOM PRECO
22/08/2026,-45.90,6212a1e2-0004,Compra no débito - UBER *TRIP
28/08/2026,-38.00,6212a1e2-0005,Tarifa mensal`;

/** Fatura CSV: valores TODOS POSITIVOS e uma coluna de categoria do emissor. */
export const CSV_FATURA_POSITIVA = `date,category,title,amount
2026-08-03,restaurante,iFood,78.40
2026-08-07,saude,Drogaria Pacheco,249.90
2026-08-14,casa,Loja de Moveis - Parcela 3/10,1200.00
2026-08-20,transporte,Uber *Trip,45.90
2026-08-22,servicos,Atelie da Ana,180.00`;

/**
 * Extrato com lixo antes do cabeçalho, ponto e vírgula, colunas separadas de
 * crédito e débito, e coluna de saldo que NÃO pode ser confundida com valor.
 */
export const CSV_BAGUNCADO = `Extrato de Conta Corrente
Agencia: 1234 Conta: 56789-0
Periodo: 01/08/2026 a 31/08/2026

Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$)
05/08/2026;CREDITO SALARIO;000123;9.500,00;;9.500,00
06/08/2026;ALUGUEL IMOBILIARIA;000124;;1.800,00;7.700,00
08/08/2026;SUPERMERCADO BOM PRECO;000125;;432,15;7.267,85
20/08/2026;RENDIMENTO CDB;000126;318,44;;7.586,29

Total do periodo;;;9.818,44;2.232,15;`;

/** Planilha do próprio usuário: tudo positivo, sem sinal e sem natureza. */
export const CSV_PLANILHA_AMBIGUA = `Data;Descrição;Valor
03/08/2026;Mercado do mes;432,15
05/08/2026;Salario;9500,00
07/08/2026;Consulta dentista;250,00`;

/** Planilha com coluna de natureza (D/C) — aí a direção é confiável. */
export const CSV_PLANILHA_NATUREZA = `Data;Descrição;Tipo;Valor
03/08/2026;Mercado do mes;D;432,15
05/08/2026;Salario;C;9500,00
07/08/2026;Consulta dentista;D;250,00`;

/** Sem cabeçalho reconhecível — força o palpite posicional. */
export const CSV_SEM_CABECALHO = `14/08/2026;Padaria Sao Jose;-24,50
15/08/2026;Posto Ipiranga;-180,00
16/08/2026;Farmacia Sao Joao;-62,30`;

/**
 * Layout do Mercado Pago — ANONIMIZADO, mas com as feiúras que quebraram o
 * parser de verdade:
 *  - dois blocos de cabeçalho (o de saldos vem antes do de lançamentos);
 *  - `TRANSACTION_TYPE` casa com a palavra "TYPE" e parece coluna de natureza,
 *    quando na verdade é a DESCRIÇÃO — mapear errado apagava todos os memos;
 *  - data DD-MM-YYYY com hífen;
 *  - dezenas de "Reserva por gastos"/"Dinheiro retirado" do cofrinho, que não
 *    são gasto nem receita;
 *  - Pix do usuário PRA ELE MESMO em outra instituição.
 */
export const CSV_MERCADO_PAGO = `INITIAL_BALANCE;CREDITS;DEBITS;FINAL_BALANCE
377,22;16.183,18;-16.552,61;7,79

RELEASE_DATE;TRANSACTION_TYPE;REFERENCE_ID;TRANSACTION_NET_AMOUNT;PARTIAL_BALANCE
01-07-2026;Rendimentos ;1746070030010;0,17;377,39
02-07-2026;Pagamento com QR Pix 99 TECNOLOGIA LTDA;166796556722;-12,80;364,76
02-07-2026;Reserva por gastos Emergency;166796853458;-15,00;349,76
03-07-2026;Pix recebido MARIA DA SILVA SANTOS;166955469866;394,74;744,66
03-07-2026;Pix enviado Joao Pereira Lima;167007937230;-15,00;697,16
04-07-2026;Pix recebido MARIA DA SILVA SANTOS;166288037669;6.770,00;7.422,76
05-07-2026;Reserva programada Emergency;166452204217;-50,00;7.321,26
06-07-2026;Pagamento com QR Pix 99 TECNOLOGIA LTDA;167470166544;-6,45;7.210,14
07-07-2026;Pagamento de conta EMPRESA DE COBRANCA LTDA;166766263487;-116,60;6.944,70
10-07-2026;Dinheiro retirado Emergency;168173434060;1.343,00;1.534,87
10-07-2026;Pix enviado Maria da Silva Santos;167316433271;-500,00;1.034,87
15-07-2026;Pagamento com QR Pix IFOOD.COM AGENCIA DE RESTAURANTES ONLINE S.A.;168134968607;-43,00;23,16
20-07-2026;Pagamento com QR Pix 99 FOOD LTDA.;169771356162;-40,62;2,55
29-07-2026;Pagamento com QR Pix JTM Textil Ltda;171035181648;-120,97;7,79`;

/**
 * Layout do Bradesco — ANONIMIZADO. Duas armadilhas reais:
 *  - o arquivo inteiro usa `\r` sozinho como quebra de linha (formato antigo);
 *  - a CONTRAPARTE vem numa LINHA DE CONTINUAÇÃO, sem data e sem valor, logo
 *    depois do lançamento. Era o que virava "linha ignorada" e sumia.
 * O rodapé emendado no fim também é fiel ao original.
 */
export const CSV_BRADESCO = [
  'Extrato de: Ag: 2 | Conta: 000000-0 | Entre 01/07/2026 e 31/07/2026',
  'Data;Histórico;Docto.;Crédito (R$);Débito (R$);Saldo (R$);',
  '30/06/26;SALDO ANTERIOR;;;;"1,76";',
  '06/07/26; Trans Sal p/c/c;0603493;"6.769,11";;"6.770,87";',
  ';Empregador Exemplo Ltda;;',
  '06/07/26; Transfe Pix;0635133;;"-6.770,00";;',
  'Des: Maria da Silva Santos 04/07;;',
  '06/07/26; Conta Telefone;0001943;;"-64,00";"-63,13";',
  ';Vivo Movel-sp-11000019432;;',
  '10/07/26; Transfe Pix;1453354;;"-500,00";"0,88";',
  'Des: Joao Pereira Lima 10/07;;',
  '06/08/26; Rentab.invest Facilcred*;6767450;"0,01";;',
  ';Total;;"11.524,40";"-11.440,00";"86,16"',
  'Os dados acima têm como base 10/08/2026 e estão sujeitos a alterações.',
].join('\r');
