# Next.js

Esta versão tem breaking changes. Ler guia em `node_modules/next/dist/docs/` antes de escrever código. Respeitar avisos de deprecação.

# Workflow

- Após alterar arquivos: commit + push automático, sem o usuário pedir.
- Operações no banco (SQL, migrations): usar MCP do Supabase. Nunca pedir para rodar no SQL Editor manualmente.
