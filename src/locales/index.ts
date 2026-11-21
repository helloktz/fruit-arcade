import zhTW from "./zh-TW.json";
export const locale = "zh-TW";
export const messages = zhTW;
const numbers = new Intl.NumberFormat(locale);
export const number = (value: number) => numbers.format(value);
export function format(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? "{" + key + "}"),
  );
}
export function localizePage(root: Document) {
  root.documentElement.lang = locale;
  for (const [attribute, target] of [
    ["data-i18n", "text"],
    ["data-i18n-aria", "aria-label"],
  ] as const) {
    for (const element of root.querySelectorAll("[" + attribute + "]")) {
      const key = element.getAttribute(attribute)!;
      if (!Object.hasOwn(messages.page, key))
        throw new Error(format(messages.errors.unknownKey, { key }));
      const value = messages.page[key as keyof typeof messages.page];
      if (target === "text") element.textContent = value;
      else element.setAttribute(target, value);
    }
  }
}
