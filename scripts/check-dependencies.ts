import { fileURLToPath } from 'node:url'

interface Manifest {
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  packageManager: string
}

interface RegistryPackage {
  version: string
}

const root = new URL('../', import.meta.url)
const manifest: Manifest = await Bun.file(new URL('package.json', root)).json()
const errors: string[] = []

async function latestVersion(name: string): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
    signal: AbortSignal.timeout(20000)
  })
  if (!response.ok) {
    throw new Error(`Registry lookup failed for ${name}: HTTP ${response.status}`)
  }
  const metadata: RegistryPackage = await response.json()
  return metadata.version
}

function registryName(name: string, range: string): string {
  if (!range.startsWith('npm:')) {
    return name
  }
  const alias = range.slice(4)
  return alias.slice(0, alias.lastIndexOf('@'))
}

const dependencies = Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
const queue = [...dependencies]

async function checkPackages(): Promise<void> {
  while (queue.length) {
    const [name, range] = queue.shift()!
    const source = registryName(name, range)
    const latest = await latestVersion(source)
    const installed: RegistryPackage = await Bun.file(new URL(`node_modules/${name}/package.json`, root)).json()

    if (installed.version !== latest) {
      errors.push(`${name}: installed ${installed.version}, latest ${latest}`)
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => checkPackages()))
const latestBun = await latestVersion('bun')
if (manifest.packageManager !== `bun@${latestBun}`) {
  errors.push(`packageManager: expected bun@${latestBun}`)
}
if (Bun.version !== latestBun) {
  errors.push(`Bun runtime: running ${Bun.version}, latest ${latestBun}`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Verified ${dependencies.length} direct dependencies and Bun ${Bun.version} against npm latest tags.`)
  console.log(`Project: ${fileURLToPath(root)}`)
}
