import { closeContainer, getContainer } from '../bootstrap/container'

export default defineNitroPlugin((nitro) => {
  getContainer().startMail()
  nitro.hooks.hook('close', closeContainer)
})
