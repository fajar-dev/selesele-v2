import { closeContainer, getContainer } from '../bootstrap/container'

export default defineNitroPlugin((nitro) => {
  getContainer().startWorkers()
  nitro.hooks.hook('close', closeContainer)
})
