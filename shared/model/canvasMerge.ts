import type { CanvasContent } from './content'
import { canonicalJson } from './json'

type Value = unknown
const equal = (a: Value, b: Value) => a === undefined || b === undefined ? a === b : canonicalJson(a) === canonicalJson(b)
function merge(base: Value, local: Value, remote: Value, path: string, conflicts: string[]): Value {
  if (equal(local, remote)) {
    return local
  }
  if (equal(base, local)) {
    return remote
  }
  if (equal(base, remote)) {
    return local
  }
  if (Array.isArray(local) && Array.isArray(remote) && (base === undefined || Array.isArray(base)) && [...local, ...remote].every(value => value && typeof value === 'object' && typeof value.id === 'string')) {
    const before = new Map((base as {
        id: string
      }[] || []).map(value => [value.id, value])), ours = new Map(local.map(value => [value.id, value])), theirs = new Map(remote.map(value => [value.id, value]))
    const oldOrder = [...before.keys()], localOrder = local.filter(value => before.has(value.id)).map(value => value.id), remoteOrder = remote.filter(value => before.has(value.id)).map(value => value.id)
    const changedLocal = !equal(oldOrder.filter(id => ours.has(id)), localOrder), changedRemote = !equal(oldOrder.filter(id => theirs.has(id)), remoteOrder)
    if (changedLocal && changedRemote && !equal(localOrder, remoteOrder)) {
      conflicts.push(`${path}.order`)
    }
    const order = changedLocal ? [...ours.keys(), ...theirs.keys()] : [...theirs.keys(), ...ours.keys()]
    return [...new Set(order)].map(id => merge(before.get(id), ours.get(id), theirs.get(id), `${path}.${id}`, conflicts)).filter(value => value !== undefined)
  }
  if (base && local && remote && typeof base === 'object' && typeof local === 'object' && typeof remote === 'object' && !Array.isArray(base) && !Array.isArray(local) && !Array.isArray(remote)) {
    const result: Record<string, Value> = {}
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = merge((base as Record<string, Value>)[key], (local as Record<string, Value>)[key], (remote as Record<string, Value>)[key], `${path}.${key}`, conflicts)
      if (value !== undefined) {
        result[key] = value
      }
    }
    return result
  }
  if (path === 'kanban.nextNumber' && typeof local === 'number' && typeof remote === 'number') {
    return Math.max(local, remote)
  }
  conflicts.push(path)
  return local
}
/** Three-way merge by entity ID and property. Conflicting edits remain explicitly reviewable. */
export function mergeCanvas(base: CanvasContent, local: CanvasContent, remote: CanvasContent) {
  const conflicts: string[] = []
  if (base.kind !== local.kind || local.kind !== remote.kind) {
    return { content: local, conflicts: ['kind'] }
  }
  const content = JSON.parse(JSON.stringify(merge(base, local, remote, local.kind, conflicts))) as CanvasContent
  if (content.kind === 'kanban') {
    // Independently-created tasks may initially share a human-readable number.
    let next = Math.max(content.nextNumber, ...content.tasks.map(task => task.number + 1))
    const used = new Set<number>()
    content.tasks = content.tasks.map((task) => {
      const number = used.has(task.number) ? next++ : task.number
      used.add(number)
      return { ...task, number }
    })
    content.nextNumber = next
    const columns = new Set(content.columns.map(column => column.id))
    if (content.tasks.some(task => !columns.has(task.columnId))) {
      conflicts.push('kanban.columns')
    }
  }
  if (content.kind === 'diagram') {
    const ids = new Set(content.nodes.map(node => node.id))
    if (content.edges.some(edge => !ids.has(edge.source) || !ids.has(edge.target))) {
      conflicts.push('diagram.connectors')
    }
  }
  return { content: JSON.parse(JSON.stringify(content)) as CanvasContent, conflicts }
}
