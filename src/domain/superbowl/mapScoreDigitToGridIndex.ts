export function mapScoreDigitToGridIndex(scoreDigit: number, markers: number[]): number {
  if (!Number.isInteger(scoreDigit) || scoreDigit < 0 || scoreDigit > 9) {
    return -1;
  }

  if (markers.length !== 10) {
    return -1;
  }

  return markers.findIndex((marker) => marker === scoreDigit);
}
