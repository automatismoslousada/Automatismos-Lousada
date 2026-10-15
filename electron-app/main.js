// App Windows de Produção — janela fina que carrega a página /producao do site já existente.
// Toda a lógica (login, lista de encomendas, editor, geração do PDF) vive no site — esta app só
// abre essa página num programa instalável próprio, com ícone no ambiente de trabalho.
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const DEFAULT_URL = 'https://CHANGE-ME.vercel.app/producao'

// O config.json fica em userData (fora da pasta de instalação, que é só de leitura) para poder
// ser editado depois de instalado sem recompilar a app — ex: para apontar para outro domínio.
function loadConfig() {
  const userConfigPath = path.join(app.getPath('userData'), 'config.json')
  const bundledConfigPath = path.join(__dirname, 'config.json')
  const candidate = fs.existsSync(userConfigPath) ? userConfigPath : bundledConfigPath

  try {
    const raw = fs.readFileSync(candidate, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.url === 'string' && parsed.url) return parsed
  } catch {
    // Sem config.json válido — usa o valor por omissão abaixo.
  }
  return { url: DEFAULT_URL }
}

function createWindow() {
  const { url } = loadConfig()

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
    },
  })

  win.loadURL(url)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
