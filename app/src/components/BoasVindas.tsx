import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from '../theme/Flame';

interface Slide {
  icone: ReactNode;
  eyebrow: string;
  titulo: string;
  corpo: ReactNode;
}

/**
 * Apresentação do sistema — roda uma vez, logo depois do onboarding.
 *
 * Fica por cima do Início de verdade (com os números do usuário atrás), então
 * o que ela promete está literalmente visível no fundo. Termina perguntando
 * como ele quer começar, que é a única pergunta que importa nesse momento.
 *
 * Sem hype (§6): cada slide fala de algo que já existe e funciona.
 */
export function BoasVindas({ nome, onFechar }: { nome: string; onFechar: () => void }) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  const slides: Slide[] = [
    {
      icone: <Flame size={52} flicker />,
      eyebrow: 'o que você acabou de ganhar',
      titulo: 'Sua data é viva.',
      corpo: (
        <>
          Ela não é um chute que fica congelado numa planilha. <b>Todo mês que você lança</b>, o
          motor recalcula patrimônio, rendimento, taxa de poupança e a data — com juros{' '}
          <b>reais</b>, já descontada a inflação. Aportou mais num mês? A data anda. Gastou mais?
          Ela também anda, e eu te conto sem drama.
        </>
      ),
    },
    {
      icone: <span className="pf-bv-emoji">⚡</span>,
      eyebrow: 'o hábito',
      titulo: 'Lançar leva 30 segundos.',
      corpo: (
        <>
          São <b>três números</b>: quanto você tem investido hoje, quanto entrou e quanto saiu. O
          resto o motor deriva sozinho — aporte, rendimento e taxa de poupança. Se quiser detalhar
          por categoria, dá. E se não quiser digitar nada, <b>importa o extrato ou a fatura</b>: eu
          leio o arquivo, classifico o que reconheço e te mostro tudo pra aprovar antes de salvar.
        </>
      ),
    },
    {
      icone: <span className="pf-bv-emoji">⚖️</span>,
      eyebrow: 'o que quase nenhum app te mostra',
      titulo: 'O INSS ao lado da sua liberdade.',
      corpo: (
        <>
          No seu Início tem uma comparação direta: o que o INSS te pagaria, com que idade, com{' '}
          <b>zero</b> de patrimônio — contra a sua renda pelo Ponto FIRE, e quantos anos antes ela
          chega. Junto com <b>CoastFIRE</b> (o ponto em que você pode parar de aportar) e a{' '}
          <b>cobertura passiva</b> (quanto da sua vida já é paga por renda, não por trabalho).
        </>
      ),
    },
    {
      icone: <span className="pf-bv-emoji">🧮</span>,
      eyebrow: 'as decisões do dia',
      titulo: 'As contas chatas, prontas.',
      corpo: (
        <>
          Em <b>Ferramentas</b>: juros compostos, comparador de combustível e o{' '}
          <b>à vista × parcelado</b> — esse último compara PIX contra todas as opções de parcela,
          considera o <b>cashback</b> do seu cartão e mostra num gráfico qual sobra mais dinheiro no
          fim. É a conta que ninguém faz na hora de fechar a compra.
        </>
      ),
    },
    {
      icone: <span className="pf-bv-emoji">🏆</span>,
      eyebrow: 'pra não desistir no meio',
      titulo: 'Marcos, sequência e o card da semana.',
      corpo: (
        <>
          São 17 conquistas ligadas a coisas reais (primeiro mês, 10% da meta, primeira renda
          passiva, CoastFIRE). E no Início tem um card que <b>muda toda segunda</b>: às vezes um
          dado do Brasil ao lado do seu número, às vezes uma dica com a sua conta dentro, às vezes o{' '}
          <b>porquê que você mesmo escreveu</b> aqui hoje.
        </>
      ),
    },
  ];

  const ultimo = i === slides.length;
  const atual = slides[i];

  return (
    <div className="pf-bv-fundo" role="dialog" aria-modal="true" aria-label="Apresentação do Ponto FIRE">
      <div className="pf-glow" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)' }} />
      <div className="pf-bv-card">
        {ultimo ? (
          <>
            <div className="pf-bv-icone"><Flame size={44} flicker /></div>
            <span className="pf-eyebrow">último passo</span>
            <h2 className="pf-bv-titulo">Como você quer começar, {nome}?</h2>
            <p className="pf-bv-corpo">
              Sua data já existe, mas ela só começa a andar sozinha quando tiver um mês registrado.
              Escolha o caminho mais confortável — dá pra trocar depois.
            </p>

            <div className="pf-bv-opcoes">
              <Opcao
                emoji="✍️"
                titulo="Lançar o mês na mão"
                sub="três números, meio minuto"
                onClick={() => { onFechar(); navigate('/lancar'); }}
              />
              <Opcao
                emoji="📄"
                titulo="Importar extrato ou fatura"
                sub="OFX ou CSV — você revisa antes de salvar"
                onClick={() => { onFechar(); navigate('/importar'); }}
              />
              <Opcao
                emoji="👀"
                titulo="Só olhar por enquanto"
                sub="explorar o Início primeiro"
                onClick={onFechar}
              />
            </div>
          </>
        ) : (
          <>
            <div className="pf-bv-icone">{atual!.icone}</div>
            <span className="pf-eyebrow">{atual!.eyebrow}</span>
            <h2 className="pf-bv-titulo">{atual!.titulo}</h2>
            <p className="pf-bv-corpo">{atual!.corpo}</p>
          </>
        )}

        <div className="pf-bv-rodape">
          <div className="pf-bv-pontos" aria-hidden>
            {[...slides, null].map((_, k) => (
              <i key={k} className={k === i ? 'on' : ''} />
            ))}
          </div>
          <div className="pf-bv-acoes">
            {i > 0 && (
              <button className="pf-btn-link" onClick={() => setI(i - 1)}>voltar</button>
            )}
            {!ultimo && (
              <>
                <button className="pf-btn-link" onClick={onFechar}>pular</button>
                <button
                  className="pf-btn pf-btn-primary"
                  style={{ width: 'auto', padding: '0.7rem 1.6rem' }}
                  onClick={() => setI(i + 1)}
                >
                  Continuar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Opcao({
  emoji,
  titulo,
  sub,
  onClick,
}: {
  emoji: string;
  titulo: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="pf-bv-opcao" onClick={onClick}>
      <span className="pf-bv-opcao-emoji">{emoji}</span>
      <span>
        <strong>{titulo}</strong>
        <span className="pf-hint" style={{ display: 'block', margin: 0 }}>{sub}</span>
      </span>
    </button>
  );
}
