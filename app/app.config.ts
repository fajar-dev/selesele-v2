export default defineAppConfig({
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral'
    },
    button: {
      slots: { base: 'rounded-[5px] font-medium transition-colors duration-200' },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'hover:bg-primary active:bg-primary hover:brightness-95' },
        { color: ['primary', 'neutral'], variant: 'soft', class: 'bg-muted text-toned hover:bg-accented/50 active:bg-accented/70' }
      ]
    },
    input: { slots: { base: 'rounded-[5px] ring-default placeholder:text-dimmed' } },
    textarea: { slots: { base: 'rounded-[5px]' } },
    select: { slots: { base: 'rounded-[5px]' } },
    badge: {
      slots: { base: 'rounded-[2px] font-medium' },
      compoundVariants: [{ color: ['primary', 'neutral'], variant: 'soft', class: 'bg-muted text-muted' }]
    },
    modal: { slots: {
      overlay: 'bg-black/45',
      content: 'rounded-[8px] shadow-lg ring-default',
      header: 'px-6 py-5 sm:px-6 border-b border-muted',
      body: 'p-6 sm:p-6',
      title: 'font-semibold tracking-tight text-lg',
      description: 'text-muted text-sm leading-relaxed mt-1'
    } },
    dropdownMenu: { slots: { content: 'rounded-[6px] shadow-lg ring-muted p-1', item: 'rounded-[4px] py-2', itemLeadingIcon: 'text-muted' } },
    card: { slots: { root: 'rounded-[6px] shadow-none ring-muted', header: 'border-muted', footer: 'border-muted' } },
    empty: { slots: { root: 'rounded-none border-x-0 border-b-0 border-t border-solid border-muted', title: 'font-semibold tracking-tight', description: 'text-muted leading-relaxed text-sm' } },
    avatar: {
      slots: {
        root: 'rounded-[2px]',
        fallback: 'text-inherit font-bold'
      }
    },
    editor: {
      slots: {
        base: [
          // Tables
          '[&_table]:w-full [&_table]:border-separate [&_table]:border-spacing-0 [&_table]:rounded-none',
          '[&_th]:py-3 [&_th]:px-4 [&_th]:font-semibold [&_th]:text-sm [&_th]:text-left [&_th]:bg-muted/50 [&_th]:border-t [&_th]:border-b [&_th]:border-e [&_th]:first:border-s [&_th]:border-muted',
          '[&_th_p]:my-0 [&_th_p]:leading-5',
          '[&_td]:py-3 [&_td]:px-4 [&_td]:text-sm [&_td]:text-left [&_td]:border-b [&_td]:border-e [&_td]:first:border-s [&_td]:border-muted',
          '[&_td_p]:my-0 [&_td_p]:leading-5 [&_td_code]:text-xs/5 [&_td_ul]:my-0 [&_td_ol]:my-0 [&_td_ul]:ps-4.5 [&_td_ol]:ps-4.5 [&_td_li]:leading-6 [&_td_li]:my-0.5',
          '[&_tr:first-child_th:first-child]:rounded-tl-none [&_tr:first-child_th:last-child]:rounded-tr-none [&_tr:last-child_td:first-child]:rounded-bl-none [&_tr:last-child_td:last-child]:rounded-br-none',
          '[&_.selectedCell]:bg-primary/10 [&_.selectedCell]:ring-2 [&_.selectedCell]:ring-primary [&_.selectedCell]:ring-inset',
          // Task lists
          '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ps-1',
          '[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-center [&_ul[data-type=taskList]_li]:ps-0',
          '[&_ul[data-type=taskList]_li_label]:inline-flex [&_ul[data-type=taskList]_li_label]:pr-2.5',
          '[&_ul[data-type=taskList]_li_label_input]:appearance-none [&_ul[data-type=taskList]_li_label_input]:size-4 [&_ul[data-type=taskList]_li_label_input]:rounded-sm [&_ul[data-type=taskList]_li_label_input]:ring [&_ul[data-type=taskList]_li_label_input]:ring-inset [&_ul[data-type=taskList]_li_label_input]:ring-accented [&_ul[data-type=taskList]_li_label_input]:bg-center',
          '[&_ul[data-type=taskList]_li_label_input:checked]:bg-primary [&_ul[data-type=taskList]_li_label_input:checked]:ring-primary [&_ul[data-type=taskList]_li_label_input:checked]:bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDZMOSAxN2wtNS01Ii8+PC9zdmc+)] dark:[&_ul[data-type=taskList]_li_label_input:checked]:bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNCIgaGVpZ2h0PSIxNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDZMOSAxN2wtNS01Ii8+PC9zdmc+)]',
          '[&_ul[data-type=taskList]_li[data-checked=true]>div>p]:line-through [&_ul[data-type=taskList]_li[data-checked=true]>div>p]:opacity-50'
        ]
      }
    }
  }
})
