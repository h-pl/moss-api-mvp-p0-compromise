'use client';
import { ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createApp, defineComponent, h, onBeforeUnmount, shallowRef, watch, type Component, type VNodeChild, type VNodeRef } from 'vue';
import * as R from 'reka-ui';
import { parseDate, type DateValue } from '@internationalized/date';

/** Vue owns Reka's component tree and focus/keyboard behavior. React portals only fill content slots. */
type Slot = (name: string, tag?: string, attributes?: Record<string, unknown>) => VNodeChild;
type Renderer = (slot: Slot) => VNodeChild;
function VueIsland({ render, slots = {} }: { render: Renderer; slots?: Record<string, ReactNode> }) {
  const host = useRef<HTMLSpanElement>(null);
  const update = useRef<((render: Renderer) => void) | null>(null);
  const [targets, setTargets] = useState<Record<string, Element>>({});
  const id = useId();
  useLayoutEffect(() => {
    if (!host.current) return;
    let alive = true;
    const nodes = new Map<string, Element>();
    const callbacks = new Map<string, (node: Element | null) => void>();
    const current = shallowRef<Renderer>(() => null);
    const slot: Slot = (name, tag = 'span', attributes = {}) => {
      if (!callbacks.has(name)) callbacks.set(name, node => {
        if (!alive || nodes.get(name) === node) return;
        if (node) nodes.set(name, node); else nodes.delete(name);
        setTargets(Object.fromEntries(nodes));
      });
      return h(tag, { style: { display: 'contents' }, ...attributes, ref: callbacks.get(name) as VNodeRef, key: name });
    };
    const app = createApp({ setup: () => () => current.value(slot) });
    app.config.idPrefix = `reka-${id.replace(/[^a-zA-Z0-9]/g, '')}`;
    app.mount(host.current);
    update.current = next => { current.value = next; };
    return () => { alive = false; update.current = null; app.unmount(); };
  }, [id]);
  useLayoutEffect(() => { update.current?.(render); }, [render]);
  return <><span ref={host} data-ui-library="reka-ui" style={{ display: 'contents' }} />{Object.entries(targets).map(([name, target]) => createPortal(slots[name], target, name))}</>;
}
const v = (component: Component, props: Record<string, unknown> = {}, children?: () => VNodeChild) => h(component, props, children ? { default: children } : undefined);
function glyph(name: string, size = 16) {
  const paths: Record<string, string> = { chevron: 'm6 9 6 6 6-6', left: 'm15 5-7 7 7 7', right: 'm9 5 7 7-7 7', close: 'm6 6 12 12M6 18 18 6', check: 'm5 12 4 4L19 6', calendar: 'M8 2v4M16 2v4M3 10h18M4 4h16v17H4Z' };
  return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: paths[name] ?? paths.chevron })]);
}
export function RekaDialog({ title, children, close, wide = false, alert = false, className = '', lightOverlay = false }: { title: ReactNode; children: ReactNode; close: () => void; wide?: boolean; alert?: boolean; className?: string; lightOverlay?: boolean }) {
  const previous = useRef<HTMLElement | null>(null);
  return <VueIsland slots={{ title, body: children }} render={slot => v(R.DialogRoot, { open: true, 'onUpdate:open': (open: boolean) => { if (!open) close(); } }, () => v(R.DialogPortal, {}, () => [
    v(R.DialogOverlay, { class: `p-dialog-overlay ${lightOverlay ? 'p-dialog-overlay-light' : ''}` }),
    v(R.DialogContent, { class: `p-dialog ${wide ? 'p-dialog-wide' : ''} ${className}`, role: alert ? 'alertdialog' : 'dialog', 'aria-describedby': undefined,
      onInteractOutside: (e: Event) => e.preventDefault(),
      onOpenAutoFocus: (e: Event) => { e.preventDefault(); previous.current = document.activeElement as HTMLElement; requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>('.p-dialog [data-autofocus]') ?? document.querySelector<HTMLElement>('.p-dialog input:not(:disabled)') ?? document.querySelector<HTMLElement>('.p-dialog button'); el?.focus(); }); },
      onCloseAutoFocus: (e: Event) => { e.preventDefault(); if (previous.current?.isConnected) previous.current.focus(); },
    }, () => [h('header', {}, [v(R.DialogTitle, { as: 'h2' }, () => slot('title')), v(R.DialogClose, { class: 'p-icon-button', 'aria-label': '关闭' }, () => glyph('close'))]), slot('body')]),
  ]))} />;
}
export function RekaSelect({ value, onValueChange, options, className = '', label }: { value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[]; className?: string; label: string }) {
  return <VueIsland render={() => v(R.SelectRoot, { modelValue: value, 'onUpdate:modelValue': onValueChange }, () => [
    v(R.SelectTrigger, { class: `p-select-trigger ${className}`, 'aria-label': label }, () => [v(R.SelectValue, {}, () => options.find(o => o.value === value)?.label ?? ''), v(R.SelectIcon, {}, () => glyph('chevron', 14))]),
    v(R.SelectPortal, {}, () => v(R.SelectContent, { class: 'p-select-content', position: 'popper', sideOffset: 5, collisionPadding: 12 }, () => [v(R.SelectScrollUpButton, { class: 'p-select-scroll' }, () => '⌃'), v(R.SelectViewport, {}, () => options.map(o => v(R.SelectItem, { key: o.value, value: o.value, class: 'p-select-item' }, () => [v(R.SelectItemText, {}, () => o.label), v(R.SelectItemIndicator, {}, () => glyph('check', 14))]))), v(R.SelectScrollDownButton, { class: 'p-select-scroll' }, () => '⌄')])),
  ])} />;
}
export function RekaSwitch({ checked, label, onCheckedChange }: { checked: boolean; label: string; onCheckedChange: (value: boolean) => void }) { return <VueIsland render={() => v(R.SwitchRoot, { modelValue: checked, 'onUpdate:modelValue': onCheckedChange, class: `p-switch ${checked ? 'p-switch-on' : ''}`, 'aria-label': label }, () => v(R.SwitchThumb))} />; }
export function RekaCheckbox({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (value: boolean) => void }) { return <VueIsland render={() => v(R.CheckboxRoot, { modelValue: checked, 'onUpdate:modelValue': (value: boolean | 'indeterminate') => onCheckedChange(value === true), class: 'p-checkbox' }, () => v(R.CheckboxIndicator, {}, () => glyph('check', 12)))} />; }
export function RekaHelp({ text }: { text: string }) { return <VueIsland render={() => v(R.PopoverRoot, {}, () => [v(R.PopoverTrigger, { class: 'p-help-trigger', 'aria-label': text }, () => h('svg', { width: 15, height: 15, viewBox: '2 2 20 20', 'aria-hidden': true }, [h('circle', { cx: 12, cy: 12, r: 10, fill: 'currentColor' }), h('path', { d: 'M12 11v6M12 7v1', stroke: '#fff', 'stroke-width': 2 })])), v(R.PopoverPortal, {}, () => v(R.PopoverContent, { class: 'p-help-content', sideOffset: 7, collisionPadding: 12 }, () => [h('p', {}, text), v(R.PopoverArrow)]))])} />; }
export type MenuItem = { id: string; label?: ReactNode; text?: string; className?: string; select?: () => void; type?: 'separator' | 'label' };
export function RekaResourceDisclosure({ title, children }: { title: ReactNode; children: ReactNode }) {
  return <VueIsland slots={{ title, content: children }} render={slot => v(R.CollapsibleRoot, { class: 'p-resources', unmountOnHide: false }, () => [
    h('div', { class: 'p-resource-heading' }, [slot('title'), v(R.CollapsibleTrigger, { class: 'p-resource-toggle' }, () => ['查看模型与并发上限', glyph('chevron', 14)])]),
    v(R.CollapsibleContent, { class: 'p-resource-content' }, () => slot('content')),
  ])} />;
}
export function RekaMenu({ open, onOpenChange, trigger, items }: { open: boolean; onOpenChange: (open: boolean) => void; trigger: ReactNode; items: MenuItem[] }) { return <VueIsland slots={{ trigger, ...Object.fromEntries(items.map(item => [item.id, item.label])) }} render={slot => v(R.DropdownMenuRoot, { open, 'onUpdate:open': onOpenChange }, () => [v(R.DropdownMenuTrigger, { class: 'p-account-trigger' }, () => slot('trigger')), v(R.DropdownMenuPortal, {}, () => v(R.DropdownMenuContent, { class: 'p-account-menu', side: 'top', align: 'start', sideOffset: 8, collisionPadding: 10 }, () => items.map(item => item.type === 'separator' ? v(R.DropdownMenuSeparator, { key: item.id, class: 'p-account-separator' }) : item.type === 'label' ? v(R.DropdownMenuLabel, { key: item.id, class: 'p-account-label' }, () => slot(item.id)) : v(R.DropdownMenuItem, { key: item.id, class: `p-account-item ${item.className ?? ''}`, textValue: item.text, onSelect: item.select }, () => slot(item.id)))))])} />; }
// One persistent panel avoids briefly hiding/remounting the React portal while
// Vue and React reconcile the selected tab. Keep Reka's ARIA registry in sync.
const PersistentTabsContent = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    const context = R.injectTabsRootContext();
    watch(() => props.value, (value, previous) => {
      if (previous !== undefined) context.unregisterContent(previous);
      context.registerContent(value);
    }, { immediate: true });
    onBeforeUnmount(() => context.unregisterContent(props.value));
    return () => h('div', {
      id: `${context.baseId}-content-${props.value}`,
      role: 'tabpanel', tabindex: 0, 'data-state': 'active',
      'aria-labelledby': `${context.baseId}-trigger-${props.value}`,
    }, slots.default?.());
  },
});
export function RekaTabs({ value, onValueChange, items, children, toolbar, className = 'p-tabs', bodyClassName = '', toolbarClassName = 'p-tabs-toolbar', footer }: { value: string; onValueChange: (value: string) => void; items: { value: string; label: ReactNode }[]; children: ReactNode; toolbar?: ReactNode; className?: string; bodyClassName?: string; toolbarClassName?: string; footer?: ReactNode }) {
  const panel = useRef<HTMLElement | null>(null);
  const [minHeight, setMinHeight] = useState(0);
  const changeTab = (next: string) => {
    if (next === value) return;
    // A shorter tab must still extend to the current viewport bottom, otherwise
    // the browser clamps scrollY even when the content host stays mounted.
    const height = panel.current ? Math.max(0, Math.ceil(window.innerHeight - panel.current.getBoundingClientRect().top)) : 0;
    if (panel.current) panel.current.style.minHeight = `${height}px`;
    setMinHeight(height);
    onValueChange(next);
  };
  // Keep the React portal mounted: replacing its Vue host briefly collapses the
  // page and causes the browser to clamp the scroll position on tab changes.
  return <VueIsland slots={{ content: children, toolbar, footer, ...Object.fromEntries(items.map(i => [i.value, i.label])) }} render={slot => v(R.TabsRoot, { modelValue: value, 'onUpdate:modelValue': changeTab }, () => [
    h('div', { class: toolbarClassName }, [
      v(R.TabsList, { class: className, 'aria-label': className === 'p-credits-tabs' ? '充值方式' : '用量数据' }, () => [
        className === 'p-tabs' ? v(R.TabsIndicator, { class: 'p-tabs-indicator', 'aria-hidden': true }) : null,
        ...items.map(item => v(R.TabsTrigger, { value: item.value, key: item.value }, () => slot(item.value))),
      ]),
      toolbar ? slot('toolbar') : null,
    ]),
    v(PersistentTabsContent, { value, class: bodyClassName, style: { minHeight: `${minHeight}px` }, ref: (node: { $el: HTMLElement } | null) => { panel.current = node?.$el ?? null; } }, () => slot('content')),
    footer ? slot('footer') : null,
  ])} />;
}

type CalendarScope = { weekDays: string[]; grid: { value: DateValue; rows: DateValue[][] }[] };
export function RekaDateRangePicker({ from, to, max, onValueChange }: { from: string; to: string; max: string; onValueChange: (range: { from: string; to: string }) => void }) {
  const [open, setOpen] = useState(false);
  return <VueIsland render={() => v(R.PopoverRoot, { open, 'onUpdate:open': setOpen }, () => [
    v(R.PopoverTrigger, { class: 'p-date-trigger p-date-range-trigger', 'aria-label': '日期范围' }, () => [glyph('calendar'), h('span', {}, `${from.replaceAll('-', '/')} — ${to.replaceAll('-', '/')}`)]),
    v(R.PopoverPortal, {}, () => v(R.PopoverContent, { class: 'p-calendar-popover p-range-popover', align: 'start', sideOffset: 6, collisionPadding: 12 }, () => h(R.RangeCalendarRoot as Component, { class: 'p-calendar', locale: 'zh-CN', weekStartsOn: 0, fixedWeeks: true, numberOfMonths: 2, defaultValue: { start: parseDate(from), end: parseDate(to) }, defaultPlaceholder: parseDate(from).subtract({ months: 1 }), maxValue: parseDate(max), 'onUpdate:modelValue': (range: { start?: DateValue; end?: DateValue }) => { if (range.start && range.end) { onValueChange({ from: range.start.toString(), to: range.end.toString() }); setOpen(false); } } }, { default: ({ weekDays, grid }: CalendarScope) => [
      v(R.RangeCalendarHeader, { class: 'p-calendar-header' }, () => [v(R.RangeCalendarPrev, { class: 'p-icon-button', 'aria-label': '上个月' }, () => glyph('left')), v(R.RangeCalendarHeading), v(R.RangeCalendarNext, { class: 'p-icon-button', 'aria-label': '下个月' }, () => glyph('right'))]),
      h('div', { class: 'p-range-months' }, grid.map(month => v(R.RangeCalendarGrid, { key: month.value.toString() }, () => [v(R.RangeCalendarGridHead, {}, () => v(R.RangeCalendarGridRow, {}, () => weekDays.map(day => v(R.RangeCalendarHeadCell, { key: day }, () => day)))), v(R.RangeCalendarGridBody, {}, () => month.rows.map((week, index) => v(R.RangeCalendarGridRow, { key: index }, () => week.map(date => v(R.RangeCalendarCell, { key: date.toString(), date }, () => v(R.RangeCalendarCellTrigger, { as: 'button', day: date, month: month.value }, () => String(date.day)))))))]))),
      h('p', { class: 'p-range-hint' }, '依次选择开始日期和结束日期'),
    ] }))),
  ])} />;
}
