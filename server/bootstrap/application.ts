import { createRuntimeModule } from './modules/runtime'
import { createAuthenticationModule } from './modules/authentication'
import { createWorkspaceModule } from './modules/workspace'
import { createCommunicationModule } from './modules/communication'
import { createContentModule } from './modules/content'
import { createKnowledgeModule } from './modules/knowledge'
import { createBackgroundModule } from './modules/background'

function composeApplication() {
  const runtime = createRuntimeModule()
  const authentication = createAuthenticationModule(runtime)
  const workspace = createWorkspaceModule(runtime)
  const communication = createCommunicationModule(runtime)
  const content = createContentModule(runtime, authentication, workspace, communication)
  const knowledge = createKnowledgeModule(runtime, workspace, content)
  const background = createBackgroundModule(runtime, workspace, content, knowledge)
  const services = {
    auth: authentication.auth, oauth: authentication.oauth,
    workspaces: workspace.workspaces, folders: workspace.folders, items: workspace.items, members: workspace.members, access: workspace.resources,
    notifications: communication.notifications,
    collaboration: content.collaboration, canvases: content.canvases, content: content.itemContent, comments: content.comments, images: content.images, presence: content.presence,
    settings: knowledge.settings, myTasks: knowledge.myTasks, itemResources: knowledge.itemResources, recovery: knowledge.recovery, templates: knowledge.templates,
    conversations: knowledge.conversations, completions: knowledge.completions, questions: knowledge.questions, library: knowledge.library,
    realtime: background.realtime
  }
  const lifecycle = new ApplicationLifecycle(() => {
    background.realtime.start()
    runtime.emailWorker?.start()
    background.maintenance.start()
    background.taskReminders.start()
  }, async () => {
    await background.taskReminders.close()
    await background.maintenance.close()
    await runtime.emailWorker?.close()
    runtime.emailSender?.close()
    try {
      await content.collaboration.close()
    } finally {
      await background.realtime.close()
      await runtime.database.close()
    }
  })
  return { services, startWorkers: () => lifecycle.startWorkers(), close: () => lifecycle.close() }
}
class ApplicationLifecycle {
  constructor(private readonly start: () => void, private readonly shutdown: () => Promise<void>) {}
  startWorkers() {
    this.start()
  }

  close() {
    return this.shutdown()
  }
}
let application: ReturnType<typeof composeApplication> | undefined
export function getApplication() {
  return application ??= composeApplication()
}
export async function closeApplication() {
  try {
    await application?.close()
  } finally {
    application = undefined
  }
}
