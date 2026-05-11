<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Regras de workflow

- Sempre que arquivos forem alterados, fazer commit e push ao final da tarefa, automaticamente, sem precisar que o usuário peça.
- Sempre que precisar executar SQL, criar migrations ou alterar o banco, usar as ferramentas MCP do Supabase diretamente. Nunca pedir ao usuário para rodar SQL manualmente no SQL Editor.
