/**
 * Append one NDJSON line for debug session (same file as frontend ingest when cwd is aimap/backend).
 */
import fs from 'fs'
import path from 'path'

export function agentDbgFile(payload) {
  const file = path.join(process.cwd(), '..', '..', 'debug-bb1f55.log')
  try {
    fs.appendFileSync(
      file,
      JSON.stringify({
        sessionId: 'bb1f55',
        timestamp: Date.now(),
        runId: 'pre-qa',
        ...payload,
      }) + '\n'
    )
  } catch (_) {
    /* ignore */
  }
}
