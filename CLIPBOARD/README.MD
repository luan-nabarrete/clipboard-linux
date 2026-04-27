# ClipStack

Clipboard manager para Linux com interface grafica, historico de copias, atalho global, tray e painel flutuante para colar textos rapidamente.

## O que o app faz

- Monitora continuamente o clipboard do sistema
- Mantem um historico em pilha com item mais recente no topo
- Evita duplicacoes consecutivas identicas
- Abre um painel flutuante perto do cursor com `Super+C` por padrao ou pelo icone da tray
- Permite trocar o atalho global e ligar/desligar o modo `sempre visivel`
- Cola o item clicado diretamente no app ativo com `Ctrl+V` automatizado
- Exibe lista numerada com preview abreviado e scroll
- Inicia oculto em segundo plano
- Permite personalizar as cores do painel por um seletor RGB

## Estrutura do repositorio

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
O pacote `.deb` agora declara `xdotool`, `wtype`, `ydotool` e `ydotoold` como dependencias, entao o `apt` instala isso junto automaticamente quando necessario.

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
3. No pacote `.deb`, os backends `xdotool`, `wtype`, `ydotool` e `ydotoold` vao como dependencias do sistema e o `apt` cuida disso na instalacao.
4. Em `Wayland`, o app passa a preferir `wtype` ou `ydotool`. Se so houver `xdotool`, a colagem fica limitada a apps `X11` ou `XWayland`.
5. Alguns ambientes Linux nao expoem tray de forma completa. Quando isso acontecer, o app tenta manter o painel acessivel em primeiro plano.
6. O historico fica em memoria enquanto o app estiver rodando. Ao fechar o app, o historico e descartado.
7. O pacote `.deb` cobre melhor Debian, Ubuntu, Mint, Pop!_OS e derivados. Em outras distribuicoes, prefira o `AppImage`, lembrando que o `AppImage` nao instala dependencias do sistema automaticamente.

## Observacoes

- O `package.json` usa um `homepage` placeholder (`https://clipstack.invalid`) apenas para permitir o empacotamento `.deb`
- Antes de uma publicacao oficial, vale trocar esse link pelo repositorio ou site real do projeto
- Textos longos sao armazenados por inteiro; apenas a visualizacao da lista e abreviada
