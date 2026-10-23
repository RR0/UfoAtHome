/**
 * The look the editors share, from the site's own tokens (site/style.css), as the design handoff asks (design_handoff_editeurs_ufoathome,
 * §2): the tokens, each a light-dark() pair so that it follows the colour scheme the editor is used in exactly as Canvas and CanvasText
 * do; the header an editor opens on (what it edits, its name, whether it is saved, its one Save); and its fields and buttons.
 *
 * Each editor puts these in its own shadow root's style: `TOKENS` in its `:host` rule, `HEAD` as it is, and `fields(scope)` for the
 * element its form stands in.
 */
export class EditorTheme {
  /** Declarations, for a `:host` rule. */
  static readonly TOKENS = `
  --ink: light-dark(#131a26, #e8ecf4);
  --ink-dim: light-dark(#4c5a70, #a3adc2);
  --ink-faint: light-dark(#78859b, #6f7b93);
  --ground: light-dark(#f6f8fc, #070a12);
  --ground-raised: light-dark(#ffffff, #0e1422);
  --ground-sunken: light-dark(#eaeff7, #050710);
  --line: light-dark(#dde4ef, #1e2739);
  --line-strong: light-dark(#c2ccdc, #2e3a52);
  --glow: light-dark(#9a6f12, #f5c451);
  --glow-solid: light-dark(#f0bc44, #f5c451);
  --glow-on-solid: #1a1405;
  --glow-dim: light-dark(#a07d29, #a8873a);
  --sky: light-dark(#12608f, #7fd4ff);
  --ok: light-dark(#1f7a44, #8fd7a4);
  --error: light-dark(#c0392b, #ff8a7a);
  --error-bg: light-dark(rgba(192, 57, 43, .09), rgba(255, 138, 122, .12));
  --warn-bg: light-dark(rgba(154, 111, 18, .14), rgba(245, 196, 81, .14));
  --neutral-bg: light-dark(rgba(120, 133, 155, .14), rgba(140, 155, 185, .12));
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, sans-serif;
  --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
`

  static readonly HEAD = `
.editor-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--line);
}
.editor-head[hidden] { display: none; }
.head-text { min-width: 0; }
.kicker { display: block; font: 600 12px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--glow-dim); }
.editor-title { margin: 2px 0 4px; font: 600 20px/1.3 var(--serif); color: var(--ink); }
.head-actions { display: flex; align-items: center; gap: 8px; flex: none; }
/* In the header now, side by side: the column the old strip reserved for them is gone. */
.head-actions .history { position: static; flex-direction: row; gap: 8px; }
.head-actions .history .icon-btn {
  width: 36px; height: 36px; min-width: 36px; min-height: 36px; max-width: none; max-height: none;
  display: inline-flex; align-items: center; justify-content: center;
}
.pill-btn {
  display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 16px;
  border: 1px solid var(--line-strong); border-radius: 999px; background: var(--ground-raised); color: var(--ink);
  font: 600 14px/1 var(--sans); cursor: pointer;
}
.pill-btn.primary:not(:disabled), #save:not(:disabled) { background: var(--glow-solid); border-color: var(--glow-solid); color: var(--glow-on-solid); }
`

  /**
   * Fields 38 px tall with an 8 px radius on the ground colour, pill buttons, the focus ring of the site; under every rule of the
   * editor's own (no specificity here), which still wins where it says something.
   */
  static fields(scope: string): string {
    return `
:where(${scope}) :where(input[type="text"], input[type="url"], input[type="number"], input[type="search"], input[type="date"], input[type="time"], input[type="datetime-local"], input:not([type]), select) {
  /* 38px tall with its border, in the content box the width is fitted in (see NumberFields, which counts its own room for the padding). */
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--ground);
  color: var(--ink);
  font-size: 15px;
}
:where(${scope}) :where(textarea) {
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--ground);
  color: var(--ink);
  font-size: 15px;
}
:where(${scope}) :where(input, select, textarea):focus-visible { outline: none; border-color: var(--glow-dim); box-shadow: 0 0 0 3px var(--warn-bg); }
:where(${scope}) :where([aria-invalid="true"], .invalid) { border-color: var(--error); }
/* Lists: drawn by InputFont in the tokens above, their chevron 11–16 px from the right edge. */
${scope} :is(select:not([multiple]):not([size]), .rr0-select) {
  height: 38px;
  padding: 0 30px 0 10px;
  background-size: 5px 5px, 5px 5px;
  background-position: calc(100% - 16px) 52%, calc(100% - 11px) 52%;
  color: var(--ink);
}
:where(${scope}) :where(button) {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--ground-raised);
  color: var(--ink);
  font: 600 14px/1 var(--sans);
  cursor: pointer;
}
:where(${scope}) :where(button:hover:not(:disabled)) { border-color: var(--glow-dim); background: var(--ground-sunken); }
:where(${scope}) :where(button:disabled) { opacity: .5; cursor: default; }
:where(${scope}) :where(.icon-btn) { min-width: 36px; padding: 0; border-radius: 8px; }
:where(${scope}) input[type="range"] { accent-color: var(--glow-solid); }
:where(${scope}) input[type="checkbox"], :where(${scope}) input[type="radio"] { accent-color: var(--glow-solid); }
`
  }
}
