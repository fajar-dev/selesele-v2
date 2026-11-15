import { closeApplication, getApplication } from '../bootstrap/application'

export default defineNitroPlugin((nitro) => {
  getApplication().startWorkers()
  nitro.hooks.hook('close', closeApplication)
})
