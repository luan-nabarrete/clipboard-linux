# ClipStack

Aplicacao desktop Linux com interface grafica para historico de area de transferencia no estilo do `Windows + V`, agora em `Electron` para funcionar com fluxo simples de `npm install`.

## Stack escolhida

- `Electron`
- `Node.js 16+`
- `globalShortcut`, `Tray`, `BrowserWindow` e `clipboard` nativos do Electron

## O que o app faz

- Monitora continuamente o clipboard do sistema, sem tentar interceptar `Ctrl+C` diretamente
- Mantem um historico em pilha com item mais recente no topo
- Evita duplicacoes consecutivas identicas
- Abre um painel flutuante com `Super+C` ou pelo icone da tray
- Restaura o item clicado de volta para o clipboard atual
- Exibe lista numerada com preview abreviado e scroll
- Inicia oculto em segundo plano

## Estrutura principal

```text
CLIPBOARD/
├── assets/
│   └── icon.svg
├── src/
│   ├── main/
│   │   ├── clipboard-service.js
│   │   ├── history-store.js
│   │   ├── hotkey-service.js
│   │   ├── icon.js
│   │   ├── index.js
│   │   ├── tray-service.js
│   │   └── window-manager.js
│   ├── renderer/
│   │   ├── panel.css
│   │   ├── panel.html
│   │   └── panel.js
│   ├── shared/
│   │   └── formatting.js
│   └── preload.js
├── test/
│   └── history-store.test.js
├── package.json
└── README.MD
```

## Instalacao

```bash
npm install
```

## Execucao

```bash
npm start
```

## Gerar instaladores Linux

```bash
npm run dist
```

O build gera os arquivos dentro da pasta `dist/`:

- `AppImage`: versao portatil, sem instalacao
- `.deb`: instalador para Debian, Ubuntu e derivados

Se quiser gerar separadamente:

```bash
npm run dist:appimage
npm run dist:deb
```

## Distribuir para outras pessoas

Para deixar o app mais amigavel para usuarios finais no Linux, o melhor caminho e distribuir o arquivo `.deb`.

Observacao:

- O `package.json` usa hoje um `homepage` placeholder (`https://clipstack.invalid`) apenas para permitir o empacotamento `.deb`.
- Antes de uma publicacao oficial, vale trocar isso pelo link real do seu repositorio, site ou pagina do projeto.

Fluxo recomendado para quem vai usar:

1. Baixar o arquivo `.deb`
2. Instalar com:

```bash
sudo apt install ./dist/ClipStack-0.2.0-amd64.deb
```

3. Abrir pelo menu de aplicativos procurando por `ClipStack`
4. Fixar no dock, barra de tarefas ou favoritos do sistema, se quiser

Depois de instalado, o sistema cria a entrada do aplicativo no menu com icone, entao a pessoa nao precisa abrir pelo terminal.

Para distribuições que nao usam `.deb`, voce pode enviar o `AppImage`. Nesse caso, a pessoa roda assim:

```bash
chmod +x ClipStack-0.2.0-amd64.AppImage
./ClipStack-0.2.0-amd64.AppImage
```

O `AppImage` funciona bem como versao portatil, mas o `.deb` e a opcao mais proxima de "instalar e abrir pelo icone".

## Arquitetura rapida

- `src/main/clipboard-service.js`: monitora o clipboard do sistema por polling confiavel
- `src/main/history-store.js`: gerencia o historico em memoria e a promocao de itens
- `src/main/hotkey-service.js`: registra o atalho global `Super+C`
- `src/main/tray-service.js`: controla o icone da tray e o menu
- `src/main/window-manager.js`: cria e posiciona a janela flutuante
- `src/renderer/*`: interface do painel
- `src/shared/formatting.js`: preview abreviado e tooltip

## Verificacao local

```bash
npm test
```

## Limitacoes importantes do Linux

1. Em Linux, o app observa mudancas no clipboard do sistema. Isso e mais compativel do que tentar capturar `Ctrl+C` globalmente.
2. O `Super+C` funciona melhor em `X11`. Em `Wayland`, o suporte depende do ambiente grafico e do portal de atalhos globais.
3. Alguns ambientes Linux nao expoem tray de forma completa. Quando isso acontecer, o app tenta manter o painel acessivel em primeiro plano.
4. O historico fica em memoria enquanto o app estiver rodando. Ao fechar o app, o historico e descartado.
5. O pacote `.deb` cobre melhor Debian, Ubuntu, Mint, Pop!_OS e derivados. Em outras distribuições, prefira o `AppImage`.

## Observacoes de uso

- Clique em um item para restaurar e subir esse texto para o topo do historico.
- O painel fecha com `ESC` ou ao perder foco.
- Textos longos sao armazenados por inteiro; apenas a visualizacao da lista e abreviada.
