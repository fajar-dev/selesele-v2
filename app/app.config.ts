export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },
    skeleton: { base: 'app-skeleton bg-(--app-skeleton) rounded-sm animate-skeleton-shimmer motion-reduce:animate-none' },
    button: {
      slots: { base: 'rounded-md font-medium transition-colors duration-normal' },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'hover:bg-primary active:bg-primary hover:brightness-95' },
        { color: ['primary', 'neutral'], variant: 'soft', class: 'bg-muted text-toned hover:bg-accented/50 active:bg-accented/70' }
      ]
    },
    input: { slots: { base: 'rounded-md ring-default placeholder:text-dimmed' } },
    textarea: { slots: { base: 'rounded-md' } },
    select: { slots: { base: 'rounded-md' } },
    badge: {
      slots: { base: 'rounded-xs font-medium' },
      compoundVariants: [{ color: ['primary', 'neutral'], variant: 'soft', class: 'bg-muted text-muted' }]
    },
    modal: { slots: {
      overlay: 'bg-black/45',
      content: 'rounded-lg shadow-lg ring-default',
      header: 'px-ui-2xl py-ui-xl sm:px-ui-2xl border-b border-muted',
      body: 'p-ui-2xl sm:p-ui-2xl',
      title: 'font-semibold tracking-tight text-lg',
      description: 'text-muted text-sm leading-relaxed mt-ui-xs'
    } },
    dropdownMenu: { slots: { content: 'rounded-md shadow-lg ring-muted p-ui-xs', item: 'rounded-sm py-ui-sm', itemLeadingIcon: 'text-muted' } },
    card: { slots: { root: 'rounded-md shadow-none ring-muted', header: 'border-muted', footer: 'border-muted' } },
    empty: { slots: { root: 'rounded-none border-x-0 border-b-0 border-t border-solid border-muted', title: 'font-semibold tracking-tight', description: 'text-muted leading-relaxed text-sm' } },
    avatar: {
      slots: {
        root: 'rounded-xs',
        fallback: 'text-inherit font-bold'
      }
    },
    editor: {
      slots: {
        base: [
          // Tables
          '[&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:rounded-none',
          '[&_th]:py-ui-md [&_th]:px-ui-lg [&_th]:font-semibold [&_th]:text-sm [&_th]:text-left [&_th]:bg-muted/50 [&_th]:border-t [&_th]:border-b [&_th]:border-e [&_th]:first:border-s [&_th]:border-muted',
          '[&_th_p]:my-ui-zero [&_th_p]:leading-normal',
          '[&_td]:py-ui-md [&_td]:px-ui-lg [&_td]:text-sm [&_td]:text-left [&_td]:border-b [&_td]:border-e [&_td]:first:border-s [&_td]:border-muted',
          '[&_td_p]:my-ui-zero [&_td_p]:leading-normal [&_td_code]:text-xs/normal [&_td_ul]:my-ui-zero [&_td_ol]:my-ui-zero [&_td_ul]:ps-ui-lg [&_td_ol]:ps-ui-lg [&_td_li]:leading-relaxed [&_td_li]:my-ui-2xs',
          '[&_tr:first-child_th:first-child]:rounded-tl-none [&_tr:first-child_th:last-child]:rounded-tr-none [&_tr:last-child_td:first-child]:rounded-bl-none [&_tr:last-child_td:last-child]:rounded-br-none',
          '[&_.selectedCell]:bg-primary/10 [&_.selectedCell]:ring-2 [&_.selectedCell]:ring-primary [&_.selectedCell]:ring-inset',
          // Task lists
          '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ps-ui-xs',
          '[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-center [&_ul[data-type=taskList]_li]:ps-ui-zero',
          '[&_ul[data-type=taskList]_li_label]:inline-flex [&_ul[data-type=taskList]_li_label]:pr-ui-sm',
          '[&_ul[data-type=taskList]_li_label_input]:appearance-none [&_ul[data-type=taskList]_li_label_input]:size-ui-lg [&_ul[data-type=taskList]_li_label_input]:rounded-sm [&_ul[data-type=taskList]_li_label_input]:ring [&_ul[data-type=taskList]_li_label_input]:ring-inset [&_ul[data-type=taskList]_li_label_input]:ring-accented [&_ul[data-type=taskList]_li_label_input]:bg-center',
          '[&_ul[data-type=taskList]_li_label_input:checked]:bg-primary [&_ul[data-type=taskList]_li_label_input:checked]:ring-primary [&_ul[data-type=taskList]_li_label_input:checked]:bg-(image:--app-task-check)',
          '[&_ul[data-type=taskList]_li[data-checked=true]>div>p]:line-through [&_ul[data-type=taskList]_li[data-checked=true]>div>p]:opacity-50'
        ]
      }
    }
  }
})
