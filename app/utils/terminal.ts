const reset = '\x1b[0m';

export const escapeCodes = {
  reset,
  clear: '\x1b[g',
  red: '\x1b[1;31m',
  yellow: '\x1b[1;33m',
  gray: '\x1b[1;90m',
};

export const coloredText = {
  red: (text: string) => `${escapeCodes.red}${text}${reset}`,
  yellow: (text: string) => `${escapeCodes.yellow}${text}${reset}`,
  gray: (text: string) => `${escapeCodes.gray}${text}${reset}`,
};
