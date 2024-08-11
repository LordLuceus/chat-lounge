export const ariaListOpen = (label: string, count: number) => {
  return `${label}, ${count} ${count < 2 ? "option" : "options"} available.`;
};
