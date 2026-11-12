# UI sizing

Nuxt UI supplies the component primitives. `app/assets/css/tokens.css` owns the application's size, spacing, container, motion, color and breakpoint definitions.

- Use component `size="sm"`, `md`, `lg` and standard typography/radius names.
- Use semantic spacing utilities: `p-ui-sm`, `px-ui-lg`, `gap-ui-md`, `space-y-ui-xl`.
- Spacing and dimension utilities use the `ui` namespace, such as `size-ui-lg` and `h-ui-4xl`. This avoids collisions with Tailwind keywords (`none`) and container names (`w-sm` means a container width).
- Use purpose-specific containers: `w-sidebar`, `max-w-panel-md`, `max-w-document`, `max-w-popup-lg`.
- Scoped styles reference `main.css` and consume theme variables. Use `@variant sm`, `lg`, `max-sm` or the named viewport-height variants for auth layouts.
- Grid column counts, flex ratios, opacity, and table/editor selectors describe structure or state rather than physical sizes.
- Drag indicator coordinates come from live editor rectangles. They are runtime geometry, not configurable visual dimensions.

Add a token only when an existing size does not serve the layout. Never scatter literal dimensions, numeric spacing utilities, inline style attributes, or arbitrary pixel classes through components. `bun run audit:styles` enforces this policy and runs as part of `verify`.
