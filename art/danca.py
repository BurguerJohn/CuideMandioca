"""Os passos de dança da Mandioca: poses novas de braço e as sequências de cada dança.

Cada dança tem 8 poses; o exportador vira cada uma em dois quadros (a pose e o meio do caminho até a próxima), então
todo passo dura 16 quadros e volta ao começo sem pulo. Uma pose é (balanço vertical, deslize para o lado, braço
esquerdo, braço direito, pé levantado, boca, pulo). Pé levantado: 'ambas', 'esquerda', 'direita' ou os pixels de cada
pé, {'esquerda': 3, 'direita': 0}. Braços são nomes das tabelas LEFT_ARM/RIGHT_ARM do exportador (cotovelo e mão, no
corpo de 24 de largura) ou pares de pontos.
"""

# Braços novos, além dos quatro do forró. O lado direito é o espelho do esquerdo (x -> 23 - x).
def _espelho(pontos):
    return tuple((23 - x, y) for x, y in pontos)


ESQUERDO = {
    'aberto': ((0, 21), (-3, 20)),       # braço aberto para o lado
    'v': ((1, 18), (-2, 14)),            # levantado em V
    'peito': ((5, 25), (9, 23)),         # mãos no peito (a sanfona fechada)
    'fole': ((0, 24), (-3, 24)),         # a sanfona aberta
    'chapeu': ((1, 17), (4, 11)),        # mão no chapéu
    'cruza': ((7, 25), (12, 26)),        # cruzado na barriga
    'bumbo': ((3, 24), (6, 27)),         # balanço solto do lado do corpo
    'rasga': ((2, 22), (-1, 25)),        # braço solto para trás
    'boca': ((3, 21), (8, 16)),          # mão na boca (bebendo)
    'chifre': ((0, 16), (5, 8)),         # mãos em cima da cabeça, apontando para cima: os chifres do boi
}
DIREITO = {nome: _espelho(pontos) for nome, pontos in ESQUERDO.items()}

# Descansos: além de ofegar (o de sempre, REST no exportador), ela se abana, se espreguiça, bebe água, come milho e
# cochila em pé. Quatro
# quadros cada, (balanço, braço esquerdo, braço direito, boca, olhos).
DESCANSOS = {
    'abana': [(1, 'chapeu', 'baixo', 'ofega', 'cansados'), (2, 'baixo', 'chapeu', 'ofega', 'cansados'),
              (1, 'chapeu', 'baixo', 'sorri', 'cansados'), (2, 'baixo', 'chapeu', 'ofega', 'cansados')],
    'alonga': [(1, 'v', 'v', 'sorri', 'fechados'), (0, 'v', 'v', 'ofega', 'fechados'), (-1, 'v', 'v', 'sorri', 'fechados'),
               (0, 'aberto', 'aberto', 'ofega', 'cansados')],
    'bebe': [(1, 'peito', 'baixo', 'ofega', 'cansados'), (1, 'boca', 'baixo', 'ofega', 'fechados'),
             (0, 'boca', 'baixo', 'sorri', 'fechados'), (1, 'peito', 'baixo', 'ofega', 'cansados')],
    # Come uma espiga de milho (a espiga é desenhada pelo jogo na mão): morde de boca aberta e mastiga de olho fechado.
    'milho': [(1, 'peito', 'baixo', 'sorri', 'abertos'), (1, 'boca', 'baixo', 'ofega', 'abertos'),
              (0, 'boca', 'baixo', 'sorri', 'fechados'), (1, 'peito', 'baixo', 'sorri', 'fechados')],
    # Cochilo em pé: os braços caem, a cabeça pesa e ela cabeceia de sono.
    'cochilo': [(2, 'baixo', 'baixo', 'sorri', 'fechados'), (3, 'baixo', 'baixo', 'sorri', 'fechados'),
                (3, 'baixo', 'baixo', 'ofega', 'fechados'), (1, 'baixo', 'baixo', 'sorri', 'cansados')],
    # Lê uma cartinha do correio elegante (o bilhete é desenhado pelo jogo na mão): sorri, suspira e pisca.
    'carta': [(1, 'peito', 'baixo', 'sorri', 'abertos'), (1, 'peito', 'baixo', 'sorri', 'abertos'),
              (0, 'peito', 'baixo', 'canta', 'abertos'), (1, 'peito', 'baixo', 'sorri', 'fechados')],
}

# nome: (rótulo, passos até aprender). O forró todo mundo já sabe.
ORDEM = ['forro', 'xote', 'polichinelo', 'sanfona', 'rebolado', 'baiao', 'giro', 'moonwalk', 'frevo', 'lambada', 'macarena',
         'boi-bumba', 'robo', 'balance', 'arrasta-pe', 'ciranda', 'coco', 'passinho', 'pisa-fulo', 'xaxado']

DANCAS = {
    # Passo básico do forró: o que já existia (definido no exportador, DANCE).
    'forro': None,

    # Xote: balanço manso de um lado para o outro, mãos na cintura, cabeça de lado.
    'xote': [
        (0, -2, 'lado', 'cintura', 'ambas', 'sorri'), (1, -1, 'lado', 'cintura', 'esquerda', 'sorri'),
        (1, 0, 'cintura', 'cintura', 'ambas', 'canta'), (0, 1, 'cintura', 'lado', 'direita', 'sorri'),
        (0, 2, 'cintura', 'lado', 'ambas', 'sorri'), (1, 1, 'cintura', 'lado', 'direita', 'sorri'),
        (1, 0, 'cintura', 'cintura', 'ambas', 'canta'), (0, -1, 'lado', 'cintura', 'esquerda', 'sorri'),
    ],

    # Polichinelo: pula abrindo e fechando os braços.
    'polichinelo': [
        (0, 0, 'lado', 'baixo', 'ambas', 'canta', 0), (0, 0, 'v', 'v', 'ambas', 'sorri', 2),
        (0, 0, 'v', 'v', 'ambas', 'sorri', 3), (0, 0, 'aberto', 'aberto', 'ambas', 'sorri', 1),
        (0, 0, 'lado', 'baixo', 'ambas', 'canta', 0), (0, 0, 'v', 'v', 'ambas', 'sorri', 2),
        (0, 0, 'v', 'v', 'ambas', 'sorri', 3), (0, 0, 'aberto', 'aberto', 'ambas', 'sorri', 1),
    ],

    # Sanfoneira: fecha e abre a sanfona de ar, balançando os joelhos.
    'sanfona': [
        (0, 0, 'peito', 'peito', 'ambas', 'canta'), (1, 0, 'peito', 'peito', 'ambas', 'canta'),
        (0, -1, 'fole', 'fole', 'esquerda', 'sorri'), (0, -1, 'fole', 'fole', 'esquerda', 'sorri'),
        (0, 0, 'peito', 'peito', 'ambas', 'canta'), (1, 0, 'peito', 'peito', 'ambas', 'canta'),
        (0, 1, 'fole', 'fole', 'direita', 'sorri'), (0, 1, 'fole', 'fole', 'direita', 'sorri'),
    ],

    # Rebolado: joelho dobrado e o corpo balançando forte de um lado para o outro.
    'rebolado': [
        (2, -3, 'cintura', 'cintura', 'ambas', 'sorri'), (1, -3, 'cintura', 'cintura', 'ambas', 'sorri'),
        (2, 3, 'cintura', 'cintura', 'ambas', 'canta'), (1, 3, 'cintura', 'cintura', 'ambas', 'canta'),
        (2, -3, 'cintura', 'cintura', 'ambas', 'sorri'), (1, -3, 'cintura', 'cintura', 'ambas', 'sorri'),
        (2, 3, 'cintura', 'cintura', 'ambas', 'canta'), (1, 3, 'cintura', 'cintura', 'ambas', 'canta'),
    ],

    # Baião: pé para o alto e a mão no chapéu, alternando.
    'baiao': [
        (0, 0, 'chapeu', 'baixo', 'esquerda', 'canta', 1), (0, 0, 'chapeu', 'baixo', 'ambas', 'sorri'),
        (-1, 1, 'alto', 'baixo', 'direita', 'sorri', 1), (0, 0, 'diag', 'baixo', 'ambas', 'canta'),
        (0, 0, 'baixo', 'chapeu', 'direita', 'canta', 1), (0, 0, 'baixo', 'chapeu', 'ambas', 'sorri'),
        (-1, -1, 'baixo', 'alto', 'esquerda', 'sorri', 1), (0, 0, 'baixo', 'diag', 'ambas', 'canta'),
    ],

    # Giro: uma volta inteira em 16 quadros (definida no exportador: precisa de frente, costas e meia-volta).
    'giro': None,

    # Moonwalk: desliza de costas de um lado para o outro, um pé na ponta e outro no chão.
    'moonwalk': [
        (0, 2, 'bumbo', 'rasga', {'esquerda': 2, 'direita': 0}, 'sorri'),
        (0, 1, 'bumbo', 'rasga', {'esquerda': 2, 'direita': 0}, 'sorri'),
        (0, 0, 'rasga', 'bumbo', {'esquerda': 0, 'direita': 2}, 'canta'),
        (0, -1, 'rasga', 'bumbo', {'esquerda': 0, 'direita': 2}, 'canta'),
        (0, -2, 'bumbo', 'rasga', {'esquerda': 2, 'direita': 0}, 'sorri'),
        (0, -1, 'bumbo', 'rasga', {'esquerda': 2, 'direita': 0}, 'sorri'),
        (0, 0, 'rasga', 'bumbo', {'esquerda': 0, 'direita': 2}, 'canta'),
        (0, 1, 'rasga', 'bumbo', {'esquerda': 0, 'direita': 2}, 'canta'),
    ],

    # Frevo: joelho lá no alto, braços em zigue-zague e o corpo sempre pulando.
    'frevo': [
        (0, -1, 'v', 'baixo', {'esquerda': 5, 'direita': 0}, 'canta', 1),
        (-1, -1, 'alto', 'aberto', {'esquerda': 4, 'direita': 0}, 'sorri', 2),
        (0, 0, 'aberto', 'alto', 'ambas', 'sorri', 1),
        (0, 1, 'baixo', 'v', {'esquerda': 0, 'direita': 5}, 'canta', 1),
        (-1, 1, 'aberto', 'alto', {'esquerda': 0, 'direita': 4}, 'sorri', 2),
        (0, 0, 'alto', 'aberto', 'ambas', 'sorri', 1),
        (0, -1, 'v', 'v', {'esquerda': 5, 'direita': 0}, 'canta', 2),
        (-1, 1, 'v', 'v', {'esquerda': 0, 'direita': 5}, 'canta', 2),
    ],

    # Lambada: quadril de um lado para o outro com as mãos no alto e depois na cintura, o corpo sempre ondulando.
    'lambada': [
        (1, -2, 'v', 'v', 'ambas', 'sorri'), (2, -1, 'v', 'v', {'esquerda': 1, 'direita': 0}, 'sorri'),
        (1, 1, 'cintura', 'cintura', 'ambas', 'canta'), (2, 2, 'cintura', 'cintura', {'esquerda': 0, 'direita': 1}, 'canta'),
        (1, 2, 'v', 'v', 'ambas', 'sorri'), (2, 1, 'v', 'v', {'esquerda': 0, 'direita': 1}, 'sorri'),
        (1, -1, 'cintura', 'cintura', 'ambas', 'canta'), (2, -2, 'cintura', 'cintura', {'esquerda': 1, 'direita': 0}, 'canta'),
    ],

    # Macarena: um braço, o outro, mão no chapéu, mão no outro lado, quadril de lá para cá e o pulo com meia-volta no fim.
    'macarena': [
        (0, 0, 'aberto', 'baixo', 'ambas', 'sorri'), (0, 0, 'aberto', 'aberto', 'ambas', 'canta'),
        (0, 0, 'chapeu', 'aberto', 'ambas', 'sorri'), (0, 0, 'chapeu', 'chapeu', 'ambas', 'canta'),
        (1, 0, 'cruza', 'cruza', 'ambas', 'sorri'), (1, 2, 'cintura', 'cintura', 'esquerda', 'sorri'),
        (1, -2, 'cintura', 'cintura', 'direita', 'sorri'), (0, 0, 'baixo', 'baixo', 'ambas', 'canta', 3),
    ],

    # Robô: cada pose para um instante e muda de repente (as poses vêm em pares iguais), braços em ângulo reto.
    'robo': [
        (0, 0, 'aberto', 'peito', 'ambas', 'canta'), (0, 0, 'aberto', 'peito', 'ambas', 'canta'),
        (0, 0, 'peito', 'aberto', 'ambas', 'canta'), (0, 0, 'peito', 'aberto', 'ambas', 'canta'),
        (0, 0, 'alto', 'baixo', 'ambas', 'sorri'), (0, 0, 'alto', 'baixo', 'ambas', 'sorri'),
        (0, 0, 'baixo', 'alto', 'ambas', 'sorri'), (0, 0, 'baixo', 'alto', 'ambas', 'sorri'),
    ],

    # Arrasta-pé: o forró de salão, arrastando o pé de um lado para o outro com a mão do par imaginário no peito.
    'arrasta-pe': [
        (0, -2, 'aberto', 'peito', 'esquerda', 'sorri'), (1, -1, 'aberto', 'peito', 'ambas', 'sorri'),
        (0, 0, 'aberto', 'peito', 'direita', 'canta'), (1, 1, 'aberto', 'peito', 'ambas', 'sorri'),
        (0, 2, 'peito', 'aberto', 'direita', 'sorri'), (1, 1, 'peito', 'aberto', 'ambas', 'sorri'),
        (0, 0, 'peito', 'aberto', 'esquerda', 'canta'), (1, -1, 'peito', 'aberto', 'ambas', 'sorri'),
    ],

    # Boi-bumbá: as mãos viram os chifres do boi. Investe para um lado e para o outro, abaixa a cabeça na marrada, pisa
    # forte e termina com o pulo.
    'boi-bumba': [
        (0, -2, 'chifre', 'chifre', 'esquerda', 'sorri'), (1, -1, 'chifre', 'chifre', 'ambas', 'canta'),
        (0, 2, 'chifre', 'chifre', 'direita', 'sorri'), (1, 1, 'chifre', 'chifre', 'ambas', 'canta'),
        (2, 0, 'chifre', 'chifre', 'ambas', 'sorri'), (0, 0, 'aberto', 'aberto', {'esquerda': 3, 'direita': 0}, 'canta'),
        (0, 0, 'aberto', 'aberto', {'esquerda': 0, 'direita': 3}, 'canta'), (0, 0, 'v', 'v', 'ambas', 'canta', 1),
    ],

    # Balancê: o passo da quadrilha. Mãos na cintura balançando de um lado para o outro, o "anavan" com um braço
    # esticado (segurando a mão do par), o cumprimento à dama tirando o chapéu e o "viva!" de braços para cima.
    'balance': [
        (0, -2, 'cintura', 'cintura', {'esquerda': 2, 'direita': 0}, 'sorri'), (1, -1, 'cintura', 'cintura', 'ambas', 'canta'),
        (0, 2, 'cintura', 'cintura', {'esquerda': 0, 'direita': 2}, 'sorri'), (1, 1, 'cintura', 'cintura', 'ambas', 'canta'),
        (0, -1, 'aberto', 'cintura', 'esquerda', 'sorri'), (0, 1, 'cintura', 'aberto', 'direita', 'sorri'),
        (2, 0, 'chapeu', 'baixo', 'ambas', 'sorri'), (0, 0, 'v', 'v', 'ambas', 'canta', 1),
    ],

    # Ciranda: a roda de mãos dadas de Pernambuco. Braços abertos segurando as mãos de quem está do lado, passo para o
    # lado com uma descidinha no tempo forte e, uma vez por volta, a roda inteira ergue os braços.
    'ciranda': [
        (0, -1, 'aberto', 'aberto', {'esquerda': 2, 'direita': 0}, 'canta'), (1, -1, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, 0, 'aberto', 'aberto', {'esquerda': 0, 'direita': 2}, 'canta'), (1, 1, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, 1, 'aberto', 'aberto', {'esquerda': 2, 'direita': 0}, 'canta'), (1, 1, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, 0, 'v', 'v', 'ambas', 'canta'), (1, 0, 'aberto', 'aberto', 'ambas', 'sorri'),
    ],

    # Coco: bate palma no peito e pisa forte, um pé de cada vez, com um pulinho de vez em quando.
    'coco': [
        (0, 0, 'peito', 'peito', {'esquerda': 3, 'direita': 0}, 'canta'), (1, 0, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, 0, 'peito', 'peito', {'esquerda': 0, 'direita': 3}, 'canta'), (1, 0, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, -1, 'v', 'peito', 'ambas', 'canta', 1), (1, 0, 'aberto', 'aberto', 'ambas', 'sorri'),
        (0, 1, 'peito', 'v', 'ambas', 'canta', 1), (1, 0, 'aberto', 'aberto', 'ambas', 'sorri'),
    ],

    # Passinho: pé ligeiro, braço para lá e para cá e um pulo no fim.
    'passinho': [
        (0, -1, 'rasga', 'bumbo', {'esquerda': 2, 'direita': 0}, 'sorri'), (0, 1, 'bumbo', 'rasga', {'esquerda': 0, 'direita': 2}, 'sorri'),
        (1, -1, 'alto', 'baixo', 'ambas', 'canta'), (0, 1, 'baixo', 'alto', 'ambas', 'canta'),
        (0, -1, 'rasga', 'bumbo', {'esquerda': 3, 'direita': 0}, 'sorri', 1), (0, 1, 'bumbo', 'rasga', {'esquerda': 0, 'direita': 3}, 'sorri', 1),
        (1, 0, 'cintura', 'cintura', 'ambas', 'canta'), (0, 0, 'v', 'v', 'ambas', 'sorri', 2),
    ],

    # Pisa na fulô: mãos na cintura pisando forte com um pé e com o outro, depois se inclina para cada lado com a mão na
    # boca chamando "ô!", bate palma no peito e fecha com o pulo.
    'pisa-fulo': [
        (0, -1, 'cintura', 'cintura', {'esquerda': 3, 'direita': 0}, 'canta'), (1, 0, 'cintura', 'cintura', 'ambas', 'sorri'),
        (0, 1, 'cintura', 'cintura', {'esquerda': 0, 'direita': 3}, 'canta'), (1, 0, 'cintura', 'cintura', 'ambas', 'sorri'),
        (0, -2, 'boca', 'aberto', 'esquerda', 'canta'), (0, 2, 'aberto', 'boca', 'direita', 'canta'),
        (1, 0, 'peito', 'peito', 'ambas', 'sorri'), (0, 0, 'v', 'v', 'ambas', 'canta', 1),
    ],

    # Xaxado: a dança dos cangaceiros. Mão no chapéu, o outro braço cruzado segurando o "fuzil", o corpo agachado e o pé
    # batendo forte no chão, um de cada vez; troca de lado no meio e termina com o grito de braços para cima.
    'xaxado': [
        (1, -1, 'chapeu', 'cruza', {'esquerda': 3, 'direita': 0}, 'canta'), (2, -1, 'chapeu', 'cruza', 'ambas', 'sorri'),
        (1, 0, 'chapeu', 'cruza', {'esquerda': 0, 'direita': 3}, 'canta'), (2, 0, 'chapeu', 'cruza', 'ambas', 'sorri'),
        (1, 1, 'cruza', 'chapeu', {'esquerda': 3, 'direita': 0}, 'canta'), (2, 1, 'cruza', 'chapeu', 'ambas', 'sorri'),
        (1, 0, 'cruza', 'chapeu', {'esquerda': 0, 'direita': 3}, 'canta'), (0, 0, 'v', 'v', 'ambas', 'canta', 1),
    ],
}
