import { strict as assert } from 'node:assert'
import { randomUUID, randomBytes } from 'node:crypto'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createConnection } from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { databaseConfig } from '../server/platform/database/config'
import { BackupManager } from './backup/BackupManager'

const suffix = randomUUID().replaceAll('-', '')
const source = `sele_backup_test_${suffix}`, target = `sele_restore_test_${suffix}`
const config = databaseConfig()
const admin = await createConnection({ ...config, database: undefined })
const root = await mkdtemp(join(tmpdir(), 'sele-backup-test-'))
const uploads = join(root, 'uploads'), restored = join(root, 'restored')
try {
  await admin.query(`CREATE DATABASE \`${source}\``)
  await admin.query(`CREATE DATABASE \`${target}\``)
  await admin.changeUser({ database: source })
  await migrate(drizzle(admin), { migrationsFolder: './drizzle' })
  await admin.query('CREATE TABLE restore_probe (id INT PRIMARY KEY, payload MEDIUMBLOB, label VARCHAR(100))')
  const payload = randomBytes(2048), label = 'Pemulihan · 日本語 · 📝'
  await admin.query('INSERT INTO restore_probe VALUES (1, ?, ?)', [payload, label])
  const [sourceTables] = await admin.query('SHOW TABLES')
  await mkdir(uploads)
  const image = `${randomUUID()}.png`
  await Bun.write(join(uploads, image), payload)
  const base = { directory: join(root, 'backups'), host: process.env.BACKUP_MYSQL_HOST || config.host, port: Number(process.env.BACKUP_MYSQL_PORT || config.port), user: config.user, password: config.password, database: source, uploads, retentionDays: 0, container: process.env.BACKUP_MYSQL_CONTAINER }
  const writer = new BackupManager(base)
  const path = await writer.create()
  assert.equal((await writer.verify(path)).database, source)
  const reader = new BackupManager({ ...base, database: target, uploads: restored })
  await assert.rejects(() => reader.restore(path, 'wrong_database', true))
  await assert.rejects(() => reader.restore(path, target, false))
  await reader.restore(path, target, true)
  await admin.changeUser({ database: target })
  const [targetTables] = await admin.query('SHOW TABLES')
  assert.equal((targetTables as unknown[]).length, (sourceTables as unknown[]).length)
  const [rows] = await admin.query('SELECT * FROM restore_probe')
  const row = (rows as {
    payload: Buffer
    label: string
  }[])[0]!
  assert.deepEqual(row.payload, payload)
  assert.equal(row.label, label)
  assert.deepEqual(Buffer.from(await Bun.file(join(restored, image)).arrayBuffer()), payload)
  const compressed = await Bun.file(join(path, 'database.sql.gz')).arrayBuffer()
  await Bun.write(join(path, 'database.sql.gz'), new Uint8Array([...new Uint8Array(compressed), 0]))
  await assert.rejects(() => reader.verify(path), /integrity/)
  const [unchanged] = await admin.query('SELECT label FROM restore_probe')
  assert.equal((unchanged as {
    label: string
  }[])[0]!.label, label)
  console.log('Backup integration passed: full schema, binary/Unicode data, attachments, restore guards and corrupt-backup rejection in isolated databases')
} finally {
  await admin.query(`DROP DATABASE IF EXISTS \`${source}\``)
  await admin.query(`DROP DATABASE IF EXISTS \`${target}\``)
  await admin.end()
  await rm(root, { recursive: true, force: true })
}
