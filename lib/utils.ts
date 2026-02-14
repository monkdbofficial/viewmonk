export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | { [key: string]: any }
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'object' && !Array.isArray(input)) {
      for (const key in input) {
        if (input[key]) {
          classes.push(key);
        }
      }
    } else if (Array.isArray(input)) {
      const result = cn(...input);
      if (result) {
        classes.push(result);
      }
    }
  }

  return classes.join(' ');
}
