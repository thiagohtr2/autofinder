# Instruções para o Claude

Projeto AutoKan (antes giroauto; repositório autofinder). Escreva commits, PRs e mensagens em português do Brasil.

## Como as mudanças vão para o ar

A Netlify publica em https://autokan.com.br tudo o que entra no `main` (o endereço antigo, autokan.netlify.app, redireciona para ele). Para não gastar o limite com uma publicação a cada ajuste, o Thiago combinou este fluxo:

1. **Um PR de prévia aberto por vez.** O título começa com "Prévia". Toda alteração entra como commit na branch desse PR. Antes de começar, procure o PR de prévia aberto e trabalhe na branch dele; só crie um novo se não houver nenhum.
2. **A cada envio, mande o link da prévia** para o Thiago abrir e conferir: `https://deploy-preview-<número do PR>--autokan.netlify.app`. A Netlify atualiza a prévia a cada push, sempre no mesmo endereço. Atualize também a lista de mudanças na descrição do PR.
3. **Só publique quando ele pedir** ("publicar", "pode publicar", "manda pro ar"). Aí faça o merge do PR de prévia no `main` mantendo os commits (rebase). Nunca faça o merge por conta própria.
4. Depois de publicar, a próxima alteração começa numa branch nova a partir do `main` atualizado, com um novo PR de prévia.
