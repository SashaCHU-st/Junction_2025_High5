declare module 'chrono-node' {
  const chrono: {
    parseDate(text: string, ref?: Date, options?: any): Date | null;
    parse(text: string, ref?: Date, options?: any): any[];
    parseDateStrict(text: string, ref?: Date, options?: any): Date | null;
    parseStrict(text: string, ref?: Date, options?: any): any[];
  };
  export = chrono;
}
