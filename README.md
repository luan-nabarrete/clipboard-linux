# ClipStack

Clipboard manager para Linux com interface grafica, historico de copias, atalho global, tray e painel flutuante para colar textos rapidamente.

## O que o app faz

- Monitora continuamente o clipboard do sistema
- Mantem um historico em pilha com item mais recente no topo
- Evita duplicacoes consecutivas identicas
- Abre um painel flutuante perto do cursor com `Super+C` por padrao ou pelo icone da tray
- Permite trocar o atalho global e ligar/desligar o modo `sempre visivel`
- Cola o item clicado diretamente no app ativo com `Ctrl+V` automatizado
- Exibe lista numerada com prevciew abreviado e scroll
- Inicia oculto em segundo plano
- Permite personalizar as cores do painel por um seletor RGB

Este repositorio usa a pasta `CLIPBOARD/` como projeto principal:

```text
clipboard-linux/
└── CLIPBOARD/
    ├── assets/
    ├── scripts/
    ├── src/
    ├── test/
    ├── package.json
    └── README.MD
```

## Como usar sem baixar o codigo

Se a pessoa so quiser instalar e testar o app no Ubuntu ou outra distro baseada em Debian, o melhor caminho e baixar o arquivo `.deb` na pagina de release do projeto.

Passos:

1. Baixe o arquivo `ClipStack-<versao>-amd64.deb`
2. No terminal, entre na pasta onde o arquivo foi baixado
3. Instale com:

```bash
sudo apt install ./ClipStack-<versao>-amd64.deb
```

4. Depois abra pelo menu de aplicativos procurando por `ClipStack`

Esse fluxo e o mais simples para quem quer instalar e abrir pelo icone do sistema.

## Como usar baixando o projeto completo

Se a pessoa quiser baixar todo o codigo para rodar localmente:

1. Clone o repositorio ou baixe o ZIP pelo GitHub
2. Entre na pasta do projeto:

```bash
cd clipboard-linux/CLIPBOARD
```

3. Instale as dependencias:

```bash
npm install
```

4. Rode o app:

```bash
npm start
```

## Como gerar os instaladores

Dentro da pasta `CLIPBOARD/`:

```bash
npm run dist
```

Isso gera os arquivos dentro de `dist/`:

- `AppImage`: versao portatil, sem instalacao
- `.deb`: instalador para Debian, Ubuntu e derivados

Se quiser gerar separadamente:

```bash
npm run dist:appimage
npm run dist:deb
```

IMPORTANTE: a appImage só vai funcionar corretamente se houver o xdotool instalado localmente. Ferramenta inclusa na instalação via .deb

## Stack

- `Electron`
- `Node.js 16+`
- `globalShortcut`, `Tray`, `BrowserWindow` e `clipboard` nativos do Electron

## Arquitetura rapida

- `src/main/clipboard-service.js`: monitora o clipboard do sistema por polling
- `src/main/history-store.js`: gerencia o historico em memoria
- `src/main/hotkey-service.js`: registra e atualiza o atalho global
- `src/main/paste-service.js`: escolhe o backend de automacao para enviar `Ctrl+V`
- `src/main/preferences-store.js`: persiste atalho global e modo `always on top`
- `src/main/tray-service.js`: controla o icone da tray e o menu
- `src/main/window-manager.js`: cria, ancora no cursor e mantem a janela flutuante
- `src/renderer/*`: interface do painel
- `src/shared/formatting.js`: preview abreviado e tooltip

## Verificacao local

```bash
npm test
```

## Limitacoes importantes do Linux

1. Em Linux, o app observa mudancas no clipboard do sistema. Isso e mais compativel do que tentar capturar `Ctrl+C` globalmente.
2. O `Super+C` funciona melhor em `X11`. Em `Wayland`, o suporte depende do ambiente grafico e do portal de atalhos globais.
3. A colagem automatica depende de um backend do sistema: `xdotool` em `X11`, `wtype` em `Wayland` ou `ydotool` como fallback.
4. Alguns ambientes Linux nao expoem tray de forma completa. Quando isso acontecer, o app tenta manter o painel acessivel em primeiro plano.
5. O historico fica em memoria enquanto o app estiver rodando. Ao fechar o app, o historico e descartado.
6. O pacote `.deb` cobre melhor Debian, Ubuntu, Mint, Pop!_OS e derivados. Em outras distribuicoes, prefira o `AppImage`.

## Observacoes

- O `package.json` usa um `homepage` placeholder (`https://clipstack.invalid`) apenas para permitir o empacotamento `.deb`
- Antes de uma publicacao oficial, vale trocar esse link pelo repositorio ou site real do projeto
- Textos longos sao armazenados por inteiro; apenas a visualizacao da lista e abreviada

## Resumo dos commits

O historico do projeto mostra uma evolucao em tres frentes: criacao da base do app, ampliacao da experiencia de uso e estabilizacao da release `0.2.2`.

| Periodo | Commits principais | Alteracoes resumidas | Objetivo |
| --- | --- | --- | --- |
| 2026-03-30 | `c87ddb4`, `2d85bc4`, `844f193` | Criacao do repositorio, estrutura Electron, servicos principais de clipboard, historico, hotkey, tray, janela e testes iniciais; reorganizacao da documentacao no README raiz | Entregar a fundacao do ClipStack e deixar o projeto instalavel, executavel e mais facil de entender |
| 2026-03-30 | `5090b52`, `d189e2f` | Correcao do empilhamento do historico, ajustes de redimensionamento e adicao de suporte a imagens e screenshots, com melhorias em preview, tooltip e testes | Tornar o historico mais confiavel e ampliar o app para trabalhar com mais do que texto puro |
| 2026-03-30 | `6c7d46b`, `3c041d3` | Bump de versao para `v0.2.1` e refinamento visual dos cantos do painel | Consolidar a primeira release util e melhorar o acabamento da interface |
| 2026-04-26 | `e676bd8`, `28c371b` | Painel passando a abrir perto do cursor, criacao de servicos de colagem, preferencias e posicionamento, suporte melhor a hotkey configuravel, `always on top` e feedback de capacidade de colagem | Reduzir atrito no uso diario e aproximar o painel do contexto da janela ativa |
| 2026-04-26 | `0b01453`, `46e12ec` | Correcao de foco da janela ao digitar atalhos e interagir com o painel, com ajustes adicionais na logica de colagem e gerenciamento da janela | Evitar que a UI perca prioridade ou se comporte de forma inconsistente durante a interacao |
| 2026-04-26 a 2026-04-27 | `ba88925`, `5f3b4a1`, `c9fc61f` | Atualizacao de versao para `0.2.2` e correcao do fluxo de empacotamento `.deb` com script dedicado para o `electron-builder` | Preparar uma distribuicao mais estavel para release e instalacao |
| 2026-04-27 | `0271a1b`, `236ae76`, `298bcfb` | Evolucao da colagem para funcionar melhor entre janelas, com refinamentos de foco, alvo de colagem, renderer e testes; houve tambem commits auxiliares para sincronizar documentacao e lockfiles da release | Garantir que o item escolhido seja colado no app correto, mesmo fora da janela do ClipStack |

Em resumo, os commits mais recentes do branch `release/0.2.2` estao menos focados em novas funcionalidades isoladas e mais em confiabilidade operacional: abrir no lugar certo, manter foco quando necessario, colar na janela correta e gerar pacotes de distribuicao com menos friccao.
