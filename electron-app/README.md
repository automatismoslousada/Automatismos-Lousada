# Automatismos Lousada — Produção (app Windows)

Janela fina que abre a página `/producao` do site — toda a lógica (login, lista de encomendas em
produção, editor de mola/largura de corte, geração do PDF) vive no site, esta app só a apresenta
como programa instalável com ícone próprio.

## Configurar o endereço do site

**Antes de gerar o instalador** (`npm run dist`): copia `config.example.json` para `config.json`
e muda o `url` para o domínio real do site (ex: `https://automatismoslousada.vercel.app/producao`
ou `https://www.idealdoor.pt/producao`). O `config.json` que existir nesta pasta nesse momento
fica embutido no instalador — se mudares o endereço depois, tens de gerar o instalador outra vez
(`npm run dist`) para a mudança ir para quem instalar a partir daí.

**Depois de já instalado numa máquina**, para mudar o endereço só nessa máquina sem reinstalar,
edita: `%APPDATA%\automatismos-lousada-producao\config.json` (cria o ficheiro se não existir —
tem prioridade sobre o que veio embutido no instalador).

Sem nenhum `config.json` válido (nem embutido, nem em `%APPDATA%`), a app usa um endereço de
propósito inválido (`CHANGE-ME.vercel.app`) só para ser óbvio que falta configurar.

## Desenvolver / testar localmente

```
cd electron-app
npm install
npm run start
```

## Gerar o instalador Windows (.exe)

```
cd electron-app
npm install
npm run dist
```

O instalador fica em `electron-app/dist/`. Não está assinado digitalmente (ferramenta interna) —
o Windows mostra o aviso normal de "Editor desconhecido" no primeiro arranque; basta escolher
"Mais informações" → "Executar mesmo assim".
