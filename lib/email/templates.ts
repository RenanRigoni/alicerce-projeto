const BASE_STYLE = `
  <style>
    body { margin:0; padding:0; background:#F3EAE0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
    .wrapper { background:#F3EAE0; padding:40px 16px; }
    .inner { max-width:520px; margin:0 auto; }
    .logo-wrap { text-align:center; margin-bottom:28px; }
    .logo-box { display:inline-block; background:#fff; border-radius:16px; padding:16px 28px; box-shadow:0 2px 12px rgba(44,32,24,0.08); }
    .logo-name { font-size:22px; font-weight:700; color:#2C2018; letter-spacing:-0.3px; }
    .logo-sub { display:block; font-size:11px; color:#A8978E; margin-top:2px; letter-spacing:0.5px; text-transform:uppercase; }
    .card { background:#ffffff; border-radius:20px; padding:40px 36px; box-shadow:0 4px 24px rgba(44,32,24,0.08); }
    h1 { margin:0 0 8px; font-size:22px; font-weight:700; color:#2C2018; line-height:1.3; }
    .subtitle { margin:0 0 24px; font-size:15px; color:#6B5B4E; line-height:1.6; }
    .divider { border-top:1px solid #F0E6DF; margin:28px 0; }
    .btn { display:inline-block; background:linear-gradient(135deg,#D4716A,#B2524C); color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:14px 36px; border-radius:12px; box-shadow:0 4px 14px rgba(212,113,106,0.40); }
    .btn-wrap { text-align:center; }
    .link-fallback { margin:24px 0 0; font-size:12px; color:#A8978E; text-align:center; line-height:1.6; }
    .link-fallback a { color:#D4716A; word-break:break-all; }
    .aviso { margin:20px 0 0; font-size:12px; color:#A8978E; line-height:1.6; }
    .footer { text-align:center; padding-top:24px; font-size:12px; color:#C8B8B0; line-height:1.8; }
  </style>
`

function baseLayout(titulo: string, corpo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo} — Alicerce</title>
  ${BASE_STYLE}
</head>
<body>
  <div class="wrapper">
    <div class="inner">
      <div class="logo-wrap">
        <div class="logo-box">
          <span class="logo-name">Alicerce</span>
          <span class="logo-sub">Espaço Terapêutico Infantil</span>
        </div>
      </div>
      <div class="card">
        ${corpo}
        <div class="divider"></div>
        <p class="footer" style="margin:0;">
          Alicerce Espaço Terapêutico Infantil<br />
          Este e-mail foi enviado automaticamente. Não responda.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

export function templateBoasVindas(nome: string, linkAcesso: string): string {
  return baseLayout('Bem-vindo ao Alicerce', `
    <h1>Olá, ${nome}!</h1>
    <p class="subtitle">
      Sua conta no Alicerce está ativa. Acesse o portal para acompanhar
      o progresso do seu filho(a) e visualizar os próximos atendimentos.
    </p>
    <div class="divider"></div>
    <div class="btn-wrap">
      <a href="${linkAcesso}" class="btn">Acessar o portal</a>
    </div>
    <p class="link-fallback">
      Se o botão não funcionar, acesse:<br />
      <a href="${linkAcesso}">${linkAcesso}</a>
    </p>
    <p class="aviso">
      Se você não esperava este e-mail, entre em contato com a clínica.
    </p>
  `)
}

export function templateAltaConfirmada(nomeResponsavel: string, nomePaciente: string): string {
  return baseLayout('Alta confirmada', `
    <h1>Alta confirmada — ${nomePaciente}</h1>
    <p class="subtitle">
      Olá, ${nomeResponsavel}. A alta de <strong>${nomePaciente}</strong>
      foi confirmada pela equipe clínica. O prontuário permanece disponível
      para consulta no portal por 20 anos conforme exigência legal.
    </p>
    <div class="divider"></div>
    <p class="aviso">
      Em caso de dúvidas, entre em contato diretamente com a clínica.
    </p>
  `)
}

export function templateComunicado(titulo: string, corpo: string): string {
  return baseLayout(titulo, `
    <h1>${titulo}</h1>
    <p class="subtitle">${corpo}</p>
    <div class="divider"></div>
    <p class="aviso">
      Para mais informações, acesse o portal ou entre em contato com a clínica.
    </p>
  `)
}
