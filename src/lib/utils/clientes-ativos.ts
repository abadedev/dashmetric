const FALLBACK_CLIENTES_ATIVOS = 24803;

const INTRANET_URL =
  'https://intranet.dstech.com.br/system/14.clientes/relLoginsTotal.php?form=1&status=-1&ativo=S&link=-1&tech=-1&acao=Mostrar';

function parseTotalFromHtml(html: string): number {
  const rows = [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  if (rows.length === 0) return NaN;

  const lastRow = rows[rows.length - 1];
  const cells = [...lastRow.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map((m) =>
    m[1].replace(/<[^>]*>/g, '').trim()
  );

  const target = cells[4];
  if (!target) return NaN;

  const digits = target.replace(/[^\d]/g, '');
  if (!digits) return NaN;

  return Number(digits);
}

export async function getClientesAtivos(): Promise<number> {
  try {
    const session = process.env.INTRANET_SESSION;
    if (!session) return FALLBACK_CLIENTES_ATIVOS;

    const res = await fetch(INTRANET_URL, {
      headers: { Cookie: `PHPSESSID=${session}` },
      next: { revalidate: 300 },
    });

    if (!res.ok) return FALLBACK_CLIENTES_ATIVOS;

    const html = await res.text();
    const total = parseTotalFromHtml(html);

    if (!Number.isFinite(total) || Number.isNaN(total) || total <= 0) {
      return FALLBACK_CLIENTES_ATIVOS;
    }

    return total;
  } catch {
    return FALLBACK_CLIENTES_ATIVOS;
  }
}

export { FALLBACK_CLIENTES_ATIVOS };
