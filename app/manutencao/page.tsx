export default function ManutencaoPage() {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Site em manutenção</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #FDF8F3;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 480px;
          }
          h1 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 1rem;
          }
          p {
            color: #555;
            line-height: 1.6;
            font-size: 0.95rem;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Site em manutenção</h1>
          <p>Estamos realizando uma manutenção programada.<br />Em breve estaremos de volta.</p>
        </div>
      </body>
    </html>
  )
}
