import fs from 'node:fs/promises'

export async function connectDevice(port = 9223) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10000) })).json()
  const target = targets.find((item) => item.type === 'page' && item.url.startsWith('https://localhost'))
  if (!target) throw new Error('Open the development Pages app on the phone first.')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let id = 0
  const pending = new Map()
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    const entry = pending.get(message.id)
    if (!entry) return
    clearTimeout(entry.timer); pending.delete(message.id)
    message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result)
  }
  const rpc = (method, params) => new Promise((resolve, reject) => {
    const key = ++id
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(`Timed out: ${method}`)) }, 60000)
    pending.set(key, { resolve, reject, timer })
    ws.send(JSON.stringify({ id: key, method, params }))
  })
  return { close: () => ws.close(), rpc, evaluate: async (expression) => {
    const result = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  } }
}

if (process.argv[2] === 'snapshot') {
  const client = await connectDevice()
  try {
    const snapshot = await client.evaluate(`(async () => {
      const databases = await indexedDB.databases();
      const db = await new Promise((resolve,reject) => { const r=indexedDB.open('bookish-library'); r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error) });
      const stores={};
      for (const name of db.objectStoreNames) stores[name]=await new Promise((resolve,reject)=>{const r=db.transaction(name).objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
      db.close();return {databases,stores,localStorage:{...localStorage}};
    })()`)
    if (process.argv[3]) await fs.writeFile(process.argv[3], JSON.stringify(snapshot))
    const books = snapshot.stores.books || []
    const counts = {}
    for (const book of books) { const key = `${book.format}:${book.documentType || 'unset'}`; counts[key] = (counts[key] || 0) + 1 }
    console.log(JSON.stringify({ count: books.length, counts, evidence: snapshot.stores.documentEvidence?.length || 0,
      jobs: snapshot.stores.intelligenceJobs?.length || 0, series: books.filter((b)=>b.series).map((b)=>({id:b.id,title:b.title,series:b.series,total:b.seriesTotal,userDefined:b.userDefined})), saved: Boolean(process.argv[3]) },null,2))
  } finally { client.close() }
}

if (process.argv[2] === 'eval') {
  const client = await connectDevice()
  try { console.log(JSON.stringify(await client.evaluate(await fs.readFile(process.argv[3], 'utf8')), null, 2)) }
  finally { client.close() }
}
