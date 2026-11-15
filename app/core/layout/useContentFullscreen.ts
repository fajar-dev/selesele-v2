export function useContentFullscreen() {
  const isFullscreen = useState<boolean>('content-fullscreen', () => false)
  function exit() {
    isFullscreen.value = false
  }
  function toggle() {
    isFullscreen.value = !isFullscreen.value
  }
  onBeforeUnmount(exit)
  return { isFullscreen, toggle, exit }
}
