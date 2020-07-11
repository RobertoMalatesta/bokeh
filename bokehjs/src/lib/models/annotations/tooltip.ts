import {Annotation, AnnotationView} from "./annotation"
import {TooltipAttachment} from "core/enums"
import {div, style, display, undisplay, empty, remove, classes} from "core/dom"
import * as p from "core/properties"

import {bk_tooltip, bk_tooltip_custom, bk_tooltip_arrow} from "styles/tooltips"
import {bk_left, bk_right, bk_above, bk_below} from "styles/mixins"

import root_css from "styles/root.css"
import tooltips_css from "styles/tooltips.css"

const arrow_size = 10  // XXX: keep in sync with less

export class TooltipView extends AnnotationView {
  model: Tooltip

  protected el: HTMLElement
  protected shadow_el: ShadowRoot
  protected stylesheet_el: HTMLStyleElement

  initialize(): void {
    super.initialize()
    this.el = div({class: bk_tooltip})
    this.shadow_el = this.el.attachShadow({mode: "open"})
    this.stylesheet_el = style({}, ...this.styles())
    this.shadow_el.appendChild(this.stylesheet_el)
    undisplay(this.el)
    this.plot_view.canvas_view.add_overlay(this.el)
  }

  remove(): void {
    remove(this.el)
    super.remove()
  }

  connect_signals(): void {
    super.connect_signals()
    this.connect(this.model.properties.content.change, () => this.render())
    this.connect(this.model.properties.position.change, () => this._reposition())
  }

  styles(): string[] {
    return [root_css, tooltips_css]
  }

  render(): void {
    if (!this.model.visible)
      undisplay(this.el)

    super.render()
  }

  protected _render(): void {
    const {content} = this.model
    if (content == null) {
      undisplay(this.el)
      return
    }

    classes(this.el).toggle(bk_tooltip_custom, this.model.custom)
    classes(this.el).toggle(bk_tooltip_arrow, this.model.show_arrow)

    empty(this.shadow_el, this.stylesheet_el)
    this.shadow_el.appendChild(content)
  }

  protected _reposition(): void {
    const {position} = this.model
    if (position == null) {
      undisplay(this.el)
      return
    }

    const [sx, sy] = position

    const side = (() => {
      const area = this.parent.layout.bbox.relativize()
      const {attachment} = this.model
      switch (attachment) {
        case "horizontal":
          return sx < area.hcenter ? "right" : "left"
        case "vertical":
          return sy < area.vcenter ? "below" : "above"
        default:
          return attachment
      }
    })()

    this.el.classList.remove(bk_right)
    this.el.classList.remove(bk_left)
    this.el.classList.remove(bk_above)
    this.el.classList.remove(bk_below)

    display(this.el)  // XXX: {offset,client}Width() gives 0 when display="none"

    // slightly confusing: side "left" (for example) is relative to point that
    // is being annotated but CS class ".bk-left" is relative to the tooltip itself
    let top: number
    let left = 0
    let right = 0

    switch (side) {
      case "right":
        this.el.classList.add(bk_left)
        left = sx + (this.el.offsetWidth - this.el.clientWidth) + arrow_size
        top = sy - this.el.offsetHeight/2
        break
      case "left":
        this.el.classList.add(bk_right)
        right = (this.plot_view.layout.bbox.width - sx) + arrow_size
        top = sy - this.el.offsetHeight/2
        break
      case "below":
        this.el.classList.add(bk_above)
        top = sy + (this.el.offsetHeight - this.el.clientHeight) + arrow_size
        left = Math.round(sx - this.el.offsetWidth/2)
        break
      case "above":
        this.el.classList.add(bk_below)
        top = sy - this.el.offsetHeight - arrow_size
        left = Math.round(sx - this.el.offsetWidth/2)
        break
    }

    this.el.style.top = `${top}px`
    this.el.style.left = left ? `${left}px` : "auto"
    this.el.style.right = right ? `${right}px` : "auto"
  }
}

export namespace Tooltip {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Annotation.Props & {
    attachment: p.Property<TooltipAttachment>
    inner_only: p.Property<boolean>
    show_arrow: p.Property<boolean>
    position: p.Property<[number, number] | null>
    content: p.Property<HTMLElement>
    custom: p.Property<boolean>
  }
}

export interface Tooltip extends Tooltip.Attrs {}

export class Tooltip extends Annotation {
  properties: Tooltip.Props
  __view_type__: TooltipView

  constructor(attrs?: Partial<Tooltip.Attrs>) {
    super(attrs)
  }

  static init_Tooltip(): void {
    this.prototype.default_view = TooltipView

    this.define<Tooltip.Props>({
      attachment: [ p.TooltipAttachment, 'horizontal' ],
      inner_only: [ p.Boolean,           true         ],
      show_arrow: [ p.Boolean,           true         ],
    })

    this.override({
      level: 'overlay',
    })

    this.internal({
      position: [ p.Any, null        ],
      content:  [ p.Any, () => div() ],
      custom:   [ p.Any              ],
    })
  }

  clear(): void {
    this.position = null
  }
}
