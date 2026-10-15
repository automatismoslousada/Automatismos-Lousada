import nodemailer, { Transporter } from 'nodemailer'

// Envio de PDFs por email (Ficha Técnica / Orçamento) via SMTP — configurável em .env.local
// (ver .env.example). Encomendas e orçamentos podem sair de contas de email diferentes (ex:
// encomendas pelo Google Workspace da empresa, orçamentos por uma conta Gmail) através das
// variáveis SMTP_*_ENCOMENDA / SMTP_*_ORCAMENTO — cada uma cai para a SMTP_* genérica quando não
// está definida, por isso uma única conta configurada continua a servir para tudo.
type SmtpProfile = 'default' | 'encomenda' | 'orcamento'

const transporterCache: Partial<Record<SmtpProfile, Transporter>> = {}

function envVar(name: string, profile: SmtpProfile): string | undefined {
  if (profile === 'default') return process.env[name]
  return process.env[`${name}_${profile.toUpperCase()}`] || process.env[name]
}

function getSmtpConfig(profile: SmtpProfile) {
  const host = envVar('SMTP_HOST', profile)
  const port = Number(envVar('SMTP_PORT', profile) || 587)
  const user = envVar('SMTP_USER', profile)
  const pass = envVar('SMTP_PASS', profile)
  const from = envVar('SMTP_FROM', profile) || user
  return { host, port, user, pass, from }
}

function getTransporter(profile: SmtpProfile): { transporter: Transporter; from: string } {
  const { host, port, user, pass, from } = getSmtpConfig(profile)

  if (!host || !user || !pass) {
    const suffix = profile === 'default' ? '' : `_${profile.toUpperCase()}`
    throw new Error(
      `Envio de email não está configurado. Defina SMTP_HOST${suffix}, SMTP_USER${suffix} e SMTP_PASS${suffix} (ou as variáveis SMTP_* genéricas) em .env.local — ver .env.example.`
    )
  }

  if (!transporterCache[profile]) {
    transporterCache[profile] = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }

  return { transporter: transporterCache[profile], from: from! }
}

export async function sendPdfEmail(opts: {
  to: string
  subject: string
  text: string
  pdfDataUri: string // "data:application/pdf;filename=...;base64,XXXX" (saída de doc.output('datauristring'))
  fileName: string
  // Qual conta de email usar para enviar — 'encomenda'/'orcamento' usam as variáveis SMTP_*_ENCOMENDA
  // / SMTP_*_ORCAMENTO quando definidas; omitido usa sempre a conta SMTP_* genérica.
  profile?: SmtpProfile
}) {
  const { transporter, from } = getTransporter(opts.profile ?? 'default')

  const base64 = opts.pdfDataUri.includes(',') ? opts.pdfDataUri.split(',').pop()! : opts.pdfDataUri

  await transporter.sendMail({
    from: `"Automatismos Lousada" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: [
      {
        filename: opts.fileName,
        content: base64,
        encoding: 'base64',
        contentType: 'application/pdf',
      },
    ],
  })
}
