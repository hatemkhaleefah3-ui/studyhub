/**
 * Pressing Enter in a text input moves focus to the next focusable field in
 * the same `<form>` instead of submitting — mirrors the mobile keyboard "Next"
 * button behaviour.  Attach as `onKeyDown={focusNext}` on any `<input>` or
 * `<textarea>` that lives inside a multi-field form.
 *
 * On the *last* field, Enter falls through so the form submits normally.
 */
export function focusNext(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
): void {
  if (e.key !== "Enter") return;
  const form = e.currentTarget.closest("form");
  if (!form) return;
  const fields = Array.from(
    form.querySelectorAll<HTMLElement>(
      "input:not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio])," +
        "textarea," +
        "select"
    )
  );
  const idx = fields.indexOf(e.currentTarget as HTMLElement);
  if (idx >= 0 && idx < fields.length - 1) {
    e.preventDefault();
    (fields[idx + 1] as HTMLElement).focus();
  }
}
