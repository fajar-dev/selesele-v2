import { closeContainer } from '../container'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', closeContainer)
})
