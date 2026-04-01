export function isValidAverageValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function calculateValidAverage(values: Array<number | null | undefined>): number {
  const validValues = values.filter(isValidAverageValue);

  if (validValues.length === 0) {
    return 0;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);

  return total / validValues.length;
}
