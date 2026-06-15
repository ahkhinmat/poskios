export const decimalNumberTransformer = {
  to(value: number | null | undefined) {
    if (value === null || value === undefined) {
      return value ?? null;
    }

    return value;
  },
  from(value: string | number | null) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  },
};
