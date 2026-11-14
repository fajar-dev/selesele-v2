import { canonicalJson } from '#shared/kernel/json'
import type { CanvasContent, CanvasSnapshot } from '#shared/kernel/content'

interface CanvasGateway {
  get(id: string): Promise<{
    data: CanvasSnapshot
  }>
  save(id: string, content: CanvasContent, revision: number): Promise<{
    data: CanvasSnapshot
  }>
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
/** Owns draft history and compare-and-swap persistence independently of Vue. */
export class CanvasSession {
  draft: CanvasContent
  revision: number
  draftRevision: number
  saving = false
  remote: CanvasSnapshot | null = null
  private baseline: string
  private updatedAt: string
  private past: CanvasContent[] = []
  private future: CanvasContent[] = []
  constructor(private readonly gateway: CanvasGateway, private readonly id: string, state: CanvasSnapshot) {
    this.draft = copy(state.content)
    this.revision = state.revision
    this.draftRevision = state.revision
    this.updatedAt = state.updatedAt
    this.baseline = canonicalJson(state.content)
  }

  get dirty() {
    return canonicalJson(this.draft) !== this.baseline
  }

  get canUndo() {
    return this.past.length > 0
  }

  get canRedo() {
    return this.future.length > 0
  }

  edit(content: CanvasContent) {
    if (canonicalJson(content) === canonicalJson(this.draft)) {
      return
    }
    this.past = [...this.past.slice(-49), copy(this.draft)]
    this.future = []
    this.draft = copy(content)
  }

  undo() {
    const previous = this.past.at(-1)
    if (!previous) {
      return
    }
    this.future = [...this.future, copy(this.draft)]
    this.past = this.past.slice(0, -1)
    this.draft = previous
  }

  redo() {
    const next = this.future.at(-1)
    if (!next) {
      return
    }
    this.past = [...this.past, copy(this.draft)]
    this.future = this.future.slice(0, -1)
    this.draft = next
  }

  observe(state: CanvasSnapshot) {
    if (state.revision <= this.revision) {
      return
    }
    if (this.dirty || this.saving) {
      this.remote = state
      return
    }
    this.load(state)
  }

  load(state: CanvasSnapshot) {
    this.revision = state.revision
    this.draftRevision = state.revision
    this.updatedAt = state.updatedAt
    this.baseline = canonicalJson(state.content)
    this.draft = copy(state.content)
    this.remote = null
    this.past = []
    this.future = []
  }

  restore(content: CanvasContent, revision: number) {
    this.edit(content)
    this.draftRevision = revision
    if (revision !== this.revision) {
      this.remote = { content: JSON.parse(this.baseline), revision: this.revision, updatedAt: this.updatedAt }
    }
  }

  async save() {
    if (this.saving || !this.dirty) {
      return
    }
    if (this.remote) {
      throw new Error('Review the newer saved version before saving your draft')
    }
    this.saving = true
    const draft = copy(this.draft)
    try {
      const { data } = await this.gateway.save(this.id, draft, this.revision)
      this.revision = data.revision
      this.draftRevision = data.revision
      this.updatedAt = data.updatedAt
      this.baseline = canonicalJson(data.content)
      this.acknowledge(data.revision)
    } catch (cause) {
      try {
        this.observe((await this.gateway.get(this.id)).data)
      } catch { /* Feedback is owned by the caller; preserve the current draft or retry state. */ }
      throw cause
    } finally {
      this.saving = false
    }
  }

  private acknowledge(revision: number) {
    if (this.remote && this.remote.revision <= revision) {
      this.remote = null
    }
  }

  async replaceRemote() {
    const latest = (await this.gateway.get(this.id)).data
    this.revision = latest.revision
    this.remote = null
    await this.save()
  }
}
