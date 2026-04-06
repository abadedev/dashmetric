# Data Retention Notes

## `importacoes_brutas`

Current strategy:

- the application stores the full raw payload in `importacoes_brutas`
- retention is currently indefinite
- this is preserved on purpose for auditability, replay and import debugging

Why it stays this way for now:

- changing retention now could affect reprocessing and operational investigation flows
- the current phase prioritizes safety and compatibility over storage optimization

TODO for next phase:

- define retention by workspace and import batch
- decide between purge, archive or compressed cold storage
- document who can trigger cleanup and what observability/audit guarantees must remain
