<script setup lang="ts">
import { useDebounce } from '@vueuse/core'
import { useApi } from '~/core/http/useApi'
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
  autoOpen?: boolean
}>()

const open = ref(false)
const url = ref('')
const { library } = useApi()
const route = useRoute()
const search = ref('')
const query = useDebounce(search, 200)
const { data: pages } = useLazyAsyncData('page-link-picker', async () => open.value && query.value.trim() ? (await library.search(query.value, String(route.params.workspaceId))).data.filter(item => item.kind === 'page') : [], { server: false, default: () => [], watch: [query, open] })
function linkPage(item: { id: string, title: string, workspaceId: string }) {
  const href = `/workspaces/${item.workspaceId}/pages/${item.id}`
  if (props.editor.state.selection.empty) {
    props.editor.chain().focus().insertContent({ type: 'text', text: item.title, marks: [{ type: 'link', attrs: { href } }] }).run()
    open.value = false
  } else {
    url.value = href
    setLink()
  }
}

const active = computed(() => props.editor.isActive('link'))
const disabled = computed(() => !props.editor.isEditable)

watch(() => props.editor, (editor, _, onCleanup) => {
  if (!editor) {
    return
  }

  const updateUrl = () => {
    const { href } = editor.getAttributes('link')
    url.value = href || ''
  }

  updateUrl()
  editor.on('selectionUpdate', updateUrl)

  onCleanup(() => {
    editor.off('selectionUpdate', updateUrl)
  })
}, { immediate: true })

watch(active, (isActive) => {
  if (isActive && props.autoOpen) {
    open.value = true
  }
})

function setLink() {
  if (!url.value) {
    return
  }

  const { selection } = props.editor.state
  const isEmpty = selection.empty
  const hasCode = props.editor.isActive('code')

  let chain = props.editor.chain().focus()

  // When linking code, extend the code mark range first to select the full code
  if (hasCode && !isEmpty) {
    chain = chain.extendMarkRange('code').setLink({ href: url.value })
  } else {
    chain = chain.extendMarkRange('link').setLink({ href: url.value })

    if (isEmpty) {
      chain = chain.insertContent({ type: 'text', text: url.value })
    }
  }

  chain.run()
  open.value = false
}

function removeLink() {
  props.editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .unsetLink()
    .setMeta('preventAutolink', true)
    .run()

  url.value = ''
  open.value = false
}

function openLink() {
  if (!url.value) {
    return
  }
  window.open(url.value, '_blank', 'noopener,noreferrer')
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    setLink()
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{ content: 'p-ui-2xs' }"
  >
    <UTooltip text="Link">
      <UButton
        icon="i-lucide-link"
        color="neutral"
        active-color="primary"
        variant="ghost"
        active-variant="soft"
        size="sm"
        :active="active"
        :disabled="disabled"
      />
    </UTooltip>

    <template #content>
      <div class="w-ui-17xl p-ui-sm space-y-ui-sm">
        <UInput
          v-model="search"
          aria-label="Find page to link"
          icon="i-lucide-search"
          placeholder="Find a page in this workspace…"
          class="w-full"
        />
        <div
          v-if="pages.length"
          class="max-h-ui-14xl overflow-y-auto"
        >
          <UButton
            v-for="item in pages"
            :key="item.id"
            :label="item.title"
            class="w-full justify-start truncate"
            color="neutral"
            variant="ghost"
            @click="linkPage(item)"
          />
        </div>
        <p class="text-xs text-muted px-ui-xs">
          Or paste a URL
        </p>
        <UInput
          v-model="url"
          autofocus
          name="url"
          type="url"
          variant="none"
          placeholder="Paste a link..."
          @keydown="handleKeyDown"
        >
          <div class="flex items-center mr-ui-2xs">
            <UButton
              icon="i-lucide-corner-down-left"
              variant="ghost"
              size="sm"
              :disabled="!url && !active"
              title="Apply link"
              @click="setLink"
            />

            <USeparator
              orientation="vertical"
              class="h-ui-2xl mx-ui-xs"
            />

            <UButton
              icon="i-lucide-external-link"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="!url && !active"
              title="Open in new window"
              @click="openLink"
            />

            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              size="sm"
              :disabled="!url && !active"
              title="Remove link"
              @click="removeLink"
            />
          </div>
        </UInput>
      </div>
    </template>
  </UPopover>
</template>
