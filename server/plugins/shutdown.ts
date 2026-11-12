import { closeContainer } from '../bootstrap/container'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', closeContainer)
})
