// electron-builder's built-in icon embedding (win.signAndEditExecutable) goes through the same
// winCodeSign tool bundle used for code signing, which fails to extract on this machine without
// Windows Developer Mode (symlink creation error) — see README. Setting signAndEditExecutable to
// false avoids that crash, but also skips embedding our custom icon into the packaged .exe, so
// the app falls back to the default Electron icon even though the NSIS installer looks right.
// This hook runs rcedit directly (a plain bundled binary, no extraction/symlinks involved) right
// after packaging, before NSIS wraps the folder into the installer, so both the installer and the
// installed app end up with the correct icon.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

module.exports = async function afterPack(context) {
  const { appOutDir } = context
  const exeFile = fs.readdirSync(appOutDir).find((f) => f.endsWith('.exe'))
  if (!exeFile) {
    console.warn('afterPack: nenhum .exe encontrado em', appOutDir, '- a saltar correção do ícone')
    return
  }

  const exePath = path.join(appOutDir, exeFile)
  const iconPath = path.join(__dirname, 'icon.ico')
  const rceditBin = path.join(
    __dirname,
    'node_modules',
    'rcedit',
    'bin',
    process.arch === 'x64' ? 'rcedit-x64.exe' : 'rcedit.exe'
  )

  if (!fs.existsSync(rceditBin)) {
    console.warn('afterPack: rcedit não encontrado em', rceditBin, '- a saltar correção do ícone')
    return
  }

  console.log('afterPack: a aplicar o ícone a', exePath)
  execFileSync(rceditBin, [exePath, '--set-icon', iconPath], { stdio: 'inherit' })
}
