import { canvasColors } from '#shared/kernel/content'

const names = ['Ink', 'Gray', 'Red', 'Amber', 'Green', 'Blue', 'Purple']
export const canvasPalette = canvasColors.map((value, index) => ({ label: names[index]!, value: String(value) }))
