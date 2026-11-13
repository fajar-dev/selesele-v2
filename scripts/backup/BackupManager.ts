import { mkdir, readdir, lstat, open, rename, rm, chmod, copyFile, chown } from 'node:fs/promises'
import { resolve, join, relative } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

export interface BackupConfig {
  directory: string
  uploads: string
  host: string
  port: number
  user: string
  password: string
  database: string
  container?: string
  retentionDays: number
  uid?: number
  gid?: number
}
interface FileProof {
  sha256: string
  bytes: number
}
interface BackupManifest {
  format: 1
  database: string
  createdAt: string
  files: Record<'database.sql.gz' | 'uploads.tar.gz', FileProof>
}
const backupName = /^backup-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9]{8}$/
const imageName = /^[a-f0-9-]{36}\.(png|jpg|jpeg|webp|gif)$/i
export class BackupManager {
  constructor(private readonly config: BackupConfig) {
    if (!/^[a-zA-Z0-9_]{1,64}$/.test(config.database)) {
      throw new Error('Invalid database name')
    }
    const backupRoot = resolve(config.directory), uploads = resolve(config.uploads)
    for (const [parent, child] of [[backupRoot, uploads], [uploads, backupRoot]]) {
      const path = relative(parent!, child!)
      if (!path || (!path.startsWith('..') && !path.startsWith('/'))) {
        throw new Error('Backup and upload directories must be separate')
      }
    }
  }

  private environment() {
    return { ...process.env, MYSQL_PWD: this.config.password }
  }

  private mysql(binary: 'mysql' | 'mysqldump') {
    const prefix = this.config.container ? ['docker', 'exec', '-i', '-e', 'MYSQL_PWD', this.config.container] : []
    return [...prefix, binary, '--protocol=TCP', `--host=${this.config.host}`, `--port=${this.config.port}`, `--user=${this.config.user}`]
  }

  private async run(args: string[], input?: ReadableStream<Uint8Array>, output?: string) {
    const process = Bun.spawn(args, { env: this.environment(), stdin: input ?? null, stdout: output ? Bun.file(output) : 'ignore', stderr: 'pipe' })
    const errors = new Response(process.stderr).text()
    const status = await process.exited
    await errors
    if (status !== 0) {
      throw new Error(`${args[0]} failed (exit ${status}). Check client availability, credentials and storage permissions.`)
    }
  }

  private async text(args: string[]) {
    const process = Bun.spawn(args, { env: this.environment(), stdout: 'pipe', stderr: 'pipe' })
    const [value] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text()])
    if (await process.exited) {
      throw new Error(`${args[0]} failed while inspecting the backup`)
    }
    return value
  }

  private async proof(path: string): Promise<FileProof> {
    const hash = createHash('sha256')
    for await (const chunk of Bun.file(path).stream()) {
      hash.update(chunk)
    }
    return { sha256: hash.digest('hex'), bytes: (await Bun.file(path).stat()).size }
  }

  async create(): Promise<string> {
    const root = resolve(this.config.directory), uploads = resolve(this.config.uploads)
    await mkdir(root, { recursive: true, mode: 0o700 })
    await mkdir(uploads, { recursive: true })
    const lockPath = join(root, '.backup.lock')
    const lock = await open(lockPath, 'wx', 0o600).catch(() => {
      throw new Error('A backup is already running or a stale .backup.lock requires inspection')
    })
    const name = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
    const staging = join(root, `${name}.partial`), destination = join(root, name)
    try {
      await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
      await mkdir(staging, { mode: 0o700 })
      for (const file of await readdir(uploads)) {
        if (!imageName.test(file) || !(await lstat(join(uploads, file))).isFile()) {
          throw new Error('Upload storage contains an unexpected file or symbolic link')
        }
      }
      const dump = Bun.spawn([...this.mysql('mysqldump'), '--single-transaction', '--quick', '--hex-blob', '--no-tablespaces', '--set-gtid-purged=OFF', '--column-statistics=0', '--skip-lock-tables', this.config.database], { env: this.environment(), stdout: 'pipe', stderr: 'pipe' })
      const errors = new Response(dump.stderr).text()
      try {
        await this.run(['gzip', '-c'], dump.stdout, join(staging, 'database.sql.gz'))
        const status = await dump.exited
        await errors
        if (status) {
          throw new Error(`mysqldump failed (exit ${status}); no backup was published`)
        }
      } catch (cause) {
        dump.kill()
        await dump.exited
        await errors
        throw cause
      }
      await this.run(['tar', '-czf', join(staging, 'uploads.tar.gz'), '-C', uploads, '.'])
      const manifest: BackupManifest = { format: 1, database: this.config.database, createdAt: new Date().toISOString(), files: { 'database.sql.gz': await this.proof(join(staging, 'database.sql.gz')), 'uploads.tar.gz': await this.proof(join(staging, 'uploads.tar.gz')) } }
      await Bun.write(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2))
      for (const file of ['manifest.json', 'database.sql.gz', 'uploads.tar.gz']) {
        await chmod(join(staging, file), 0o600)
      }
      await this.verify(staging)
      await rename(staging, destination)
      await this.prune()
      return destination
    } catch (cause) {
      await rm(staging, { recursive: true, force: true })
      throw cause
    } finally {
      await lock.close()
      await rm(lockPath, { force: true })
    }
  }

  async verify(directory: string): Promise<BackupManifest> {
    const root = resolve(directory)
    if ((await lstat(root)).isSymbolicLink()) {
      throw new Error('Backup directory cannot be a symbolic link')
    }
    const manifestStat = await lstat(join(root, 'manifest.json'))
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) {
      throw new Error('Manifest must be a regular file')
    }
    const manifest = await Bun.file(join(root, 'manifest.json')).json() as BackupManifest
    if (manifest.format !== 1 || !/^[a-zA-Z0-9_]{1,64}$/.test(manifest.database) || !Number.isFinite(Date.parse(manifest.createdAt)) || !manifest.files) {
      throw new Error('Invalid backup manifest')
    }
    for (const filename of ['database.sql.gz', 'uploads.tar.gz'] as const) {
      if (!(await lstat(join(root, filename))).isFile() || (await lstat(join(root, filename))).isSymbolicLink()) {
        throw new Error('Backup files must be regular files')
      }
      const expected = manifest.files[filename], actual = await this.proof(join(root, filename))
      if (!expected || !/^[a-f0-9]{64}$/.test(expected.sha256) || actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) {
        throw new Error(`Backup integrity check failed: ${filename}`)
      }
    }
    await this.run(['gzip', '-t', join(root, 'database.sql.gz')])
    const names = (await this.text(['tar', '-tzf', join(root, 'uploads.tar.gz')])).trim().split('\n')
    if (names.some(name => name !== './' && !imageName.test(name.replace(/^\.\//, '')))) {
      throw new Error('Attachment archive contains an unsafe path')
    }
    const entries = (await this.text(['tar', '-tvzf', join(root, 'uploads.tar.gz')])).trim().split('\n')
    if (entries.some(line => !['-', 'd'].includes(line[0] || ''))) {
      throw new Error('Attachment archive contains links or unsupported entries')
    }
    return manifest
  }

  async restore(directory: string, confirmation: string, applicationStopped: boolean) {
    if (confirmation !== this.config.database || !applicationStopped) {
      throw new Error('Stop the application and confirm the exact target database name before restoring')
    }
    await this.verify(directory)
    await mkdir(this.config.directory, { recursive: true, mode: 0o700 })
    const lockPath = join(this.config.directory, '.backup.lock')
    const lock = await open(lockPath, 'wx', 0o600).catch(() => {
      throw new Error('Stop the backup worker before restoring')
    })
    const root = resolve(directory), uploads = resolve(this.config.uploads)
    const staging = join(this.config.directory, `.uploads-restore-${randomUUID()}`)
    try {
      await mkdir(staging, { recursive: true, mode: 0o700 })
      await mkdir(uploads, { recursive: true })
      for (const file of await readdir(uploads)) {
        if (!imageName.test(file) || !(await lstat(join(uploads, file))).isFile()) {
          throw new Error('Upload storage contains unexpected entries; restore into a clean upload directory')
        }
      }
      await this.run(['tar', '-xzf', join(root, 'uploads.tar.gz'), '--no-same-owner', '--no-same-permissions', '-C', staging])
      const unzip = Bun.spawn(['gzip', '-dc', join(root, 'database.sql.gz')], { stdout: 'pipe', stderr: 'pipe' })
      const errors = new Response(unzip.stderr).text()
      try {
        await this.run([...this.mysql('mysql'), '--binary-mode=1', this.config.database], unzip.stdout)
        if (await unzip.exited) {
          throw new Error('Unable to decompress SQL backup')
        }
        await errors
      } catch (cause) {
        unzip.kill()
        await unzip.exited
        await errors
        throw cause
      }
      const oldFiles = await readdir(uploads)
      const previous = oldFiles.length ? join(this.config.directory, `uploads-before-restore-${Date.now()}`) : null
      if (previous) {
        await mkdir(previous, { mode: 0o700 })
        for (const file of oldFiles) {
          await copyFile(join(uploads, file), join(previous, file))
          await chmod(join(previous, file), 0o600)
        }
      }
      // The application is stopped: copying also supports Docker volume mount roots.
      for (const file of oldFiles) {
        await rm(join(uploads, file))
      }
      for (const file of await readdir(staging)) {
        await copyFile(join(staging, file), join(uploads, file))
        await chmod(join(uploads, file), 0o600)
        if (this.config.uid !== undefined && this.config.gid !== undefined) {
          await chown(join(uploads, file), this.config.uid, this.config.gid)
        }
      }
      if (this.config.uid !== undefined && this.config.gid !== undefined) {
        await chown(uploads, this.config.uid, this.config.gid)
      }
      return { uploads, previous }
    } finally {
      await rm(staging, { recursive: true, force: true })
      await lock.close()
      await rm(lockPath, { force: true })
    }
  }

  private async prune() {
    if (this.config.retentionDays <= 0) {
      return
    }
    const cutoff = Date.now() - this.config.retentionDays * 86400000
    for (const entry of await readdir(this.config.directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || !backupName.test(entry.name)) {
        continue
      }
      const path = join(this.config.directory, entry.name)
      const manifest = await Bun.file(join(path, 'manifest.json')).json().catch(() => null) as BackupManifest | null
      if (manifest?.format === 1 && Date.parse(manifest.createdAt) < cutoff) {
        await rm(path, { recursive: true, force: true })
      }
    }
  }
}
