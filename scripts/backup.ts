import { resolve } from 'node:path'
import { BackupManager } from './backup/BackupManager'

const config = {
  directory: resolve(process.env.BACKUP_DIR || '.data/backups'), uploads: resolve(process.env.UPLOAD_DIR || '.data/uploads'),
  database: process.env.DB_NAME || 'sele_sele', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  host: process.env.BACKUP_MYSQL_HOST || process.env.DB_HOST || 'localhost', port: Number(process.env.BACKUP_MYSQL_PORT || process.env.DB_PORT || 3306),
  uid: process.env.RESTORE_UID ? Number(process.env.RESTORE_UID) : undefined, gid: process.env.RESTORE_GID ? Number(process.env.RESTORE_GID) : undefined,
  container: process.env.BACKUP_MYSQL_CONTAINER || undefined, retentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 14)
}
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !Number.isInteger(config.retentionDays) || config.retentionDays < 0 || config.retentionDays > 3650) {
  throw new Error('Invalid backup port or retention configuration')
}
if ((config.uid === undefined) !== (config.gid === undefined) || [config.uid, config.gid].some(value => value !== undefined && (!Number.isInteger(value) || value < 0))) {
  throw new Error('Set both RESTORE_UID and RESTORE_GID to valid numeric IDs')
}
const manager = new BackupManager(config)
const [command = 'create', directory, confirmation] = process.argv.slice(2)
if (command === 'create') {
  console.log(`Backup created: ${await manager.create()}`)
} else if (command === 'verify' && directory) {
  const manifest = await manager.verify(directory)
  console.log(`Backup verified: ${manifest.createdAt}`)
} else if (command === 'restore' && directory) {
  console.log(await manager.restore(directory, confirmation || '', process.env.APP_STOPPED_FOR_RESTORE === '1'))
} else if (command === 'schedule') {
  const hour = Number(process.env.BACKUP_HOUR_UTC || 18)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error('BACKUP_HOUR_UTC must be between 0 and 23')
  }
  let stopped = false, wake: (() => void) | undefined
  const stop = () => {
    stopped = true
    wake?.()
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  while (!stopped) {
    try {
      console.log(`Scheduled backup created: ${await manager.create()}`)
    } catch (cause) {
      console.error(cause instanceof Error ? cause.message : 'Backup failed')
    }
    const next = new Date()
    next.setUTCHours(hour, 0, 0, 0)
    if (next.getTime() <= Date.now()) {
      next.setUTCDate(next.getUTCDate() + 1)
    }
    if (!stopped) {
      await new Promise<void>((done) => {
        const timer = setTimeout(done, Math.max(1, next.getTime() - Date.now()))
        wake = () => {
          clearTimeout(timer)
          done()
        }
      })
    }
  }
} else {
  throw new Error('Usage: bun scripts/backup.ts create | verify <directory> | restore <directory> <target-database> | schedule')
}
