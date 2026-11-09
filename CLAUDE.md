# Instruções para o Claude

Projeto Autokan (antes giroauto; repositório autofinder). Escreva commits, PRs e mensagens em português do Brasil.

## Como as mudanças vão para o ar

A Netlify publica em https://autokan.com.br tudo o que entra no `main` (o endereço antigo, autokan.netlify.app, redireciona para ele). Para não gastar o limite com uma publicação a cada ajuste, o Thiago combinou este fluxo:

1. **Um PR de prévia aberto por vez.** O título começa com "Prévia". Toda alteração entra como commit na branch desse PR. Antes de começar, procure o PR de prévia aberto e trabalhe na branch dele; só crie um novo se não houver nenhum.
2. **A cada envio, mande o link da prévia** para o Thiago abrir e conferir: `https://deploy-preview-<número do PR>--autokan.netlify.app`. A Netlify atualiza a prévia a cada push, sempre no mesmo endereço. Atualize também a lista de mudanças na descrição do PR.
3. **Só publique quando ele pedir** ("publicar", "pode publicar", "manda pro ar"). Aí faça o merge do PR de prévia no `main` mantendo os commits (rebase). Nunca faça o merge por conta própria.
4. Depois de publicar, a próxima alteração começa numa branch nova a partir do `main` atualizado, com um novo PR de prévia.

## Espaçamento: regra fixa do Thiago

Margem e espaço entre blocos já geraram reclamação várias vezes. Não pode acontecer de novo.

- **Laterais:** nada encosta na lateral da tela nem sai da caixa em que está. No celular, 16 px de margem.
- **Blocos nunca se encostam:** dois blocos com fundo, borda ou sombra (botões, cartões, painéis, linhas destacadas) ficam a pelo menos 4 px um do outro, e entre um item e um painel que pertence a ele, 6 a 8 px. Só se tocam quando formam um mesmo painel, com o mesmo fundo, ou são linhas da mesma lista.
- **Antes de cada envio para a prévia,** rode a verificação e só envie com "Nenhum problema de espaçamento":
  - site local: `NODE_PATH=$(npm root -g) node testes/espacos.cjs`
  - ou a prévia já publicada: `NODE_PATH=$(npm root -g) node testes/espacos.cjs https://deploy-preview-<N>--autokan.netlify.app`
- **Tela, painel ou lista nova:** acrescente o estado em `ESTADOS`, no começo de `testes/espacos.cjs`. Antes de confiar no resultado, prove que a verificação pega o erro, por exemplo com `ESPACOS_SO="<estado>" ESPACOS_CSS="<regra que cola os blocos>"`.
- **Olhe as capturas também,** no celular (360 e 390 px) e no computador: a verificação não substitui olhar.
