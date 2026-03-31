import { NextRequest, NextResponse } from 'next/server';
import { detectFileType } from '@/lib/importacao/detect-file-type';
import { parseCsv } from '@/lib/importacao/parse-csv';
import { parseXlsx } from '@/lib/importacao/parse-xlsx';
import { normalizarLinha } from '@/lib/importacao/normalizar-linha';
import { mapearAtendimento } from '@/lib/importacao/mapear-atendimento';
import { linhaNormalizadaSchema } from '@/lib/validators/import-atendimento.schema';

export const runtime = 'nodejs';

const HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Diagnóstico</title>
<style>body{font-family:monospace;padding:2rem;background:#111;color:#eee}h2{color:#7dd3fc}button{background:#2563eb;color:#fff;border:none;padding:.5rem 1.5rem;border-radius:6px;cursor:pointer;font-size:1rem}pre{background:#1e1e1e;padding:1rem;border-radius:8px;overflow:auto;max-height:75vh;font-size:12px;color:#a3e635}.err{color:#f87171}</style>
</head>
<body>
<h2>🔍 Diagnóstico XLSX/CSV</h2>
<input type="file" id="f" accept=".xlsx,.xls,.csv"/><br/><br/>
<button onclick="diag()">Diagnosticar</button>
<pre id="out">Aguardando...</pre>
<script>
async function diag(){
  const f=document.getElementById('f').files[0];
  if(!f){alert('Selecione um arquivo');return;}
  document.getElementById('out').textContent='Enviando...';
  const fd=new FormData();fd.append('file',f);
  try{
    const res=await fetch('/api/admin/diag-import',{method:'POST',body:fd});
    const txt=await res.text();
    try{document.getElementById('out').textContent=JSON.stringify(JSON.parse(txt),null,2);}
    catch{document.getElementById('out').textContent=txt;}
    if(!res.ok)document.getElementById('out').className='err';
  }catch(e){document.getElementById('out').textContent='Erro: '+e.message;document.getElementById('out').className='err';}
}
</script>
</body></html>`;

export async function GET() {
  return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Sem arquivo' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const tipoArquivo = detectFileType(file.name, buffer);

    let linhasBrutas: Record<string, string>[];
    try {
      linhasBrutas = tipoArquivo === 'xlsx' ? parseXlsx(buffer) : parseCsv(buffer.toString('utf-8'));
    } catch (e) {
      return NextResponse.json({ etapa: 'PARSE', erro: String(e), stack: e instanceof Error ? e.stack : undefined });
    }

    const amostra = [];
    for (let i = 0; i < Math.min(5, linhasBrutas.length); i++) {
      try {
        const norm = normalizarLinha(linhasBrutas[i]);
        const parsed = linhaNormalizadaSchema.safeParse(norm);
        if (!parsed.success) {
          amostra.push({ linha: i + 2, status: 'VALIDAÇÃO_FALHOU', erros: parsed.error.issues.map(e => e.message), normalizada: norm });
          continue;
        }
        const { dados, warning } = mapearAtendimento(parsed.data as any, null, null);
        amostra.push({ linha: i + 2, status: 'OK', warning, tipo: dados.tipo, dataAbertura: dados.dataAbertura });
      } catch (e) {
        amostra.push({ linha: i + 2, status: 'EXCEÇÃO', erro: String(e) });
      }
    }

    return NextResponse.json({
      arquivo: file.name,
      tipoDetectado: tipoArquivo,
      totalLinhas: linhasBrutas.length,
      headers: linhasBrutas[0] ? Object.keys(linhasBrutas[0]) : [],
      amostra,
    });
  } catch (err) {
    return NextResponse.json({ etapa: 'GERAL', erro: String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
  }
}
