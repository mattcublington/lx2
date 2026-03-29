export type PointsTemplate = Record<string, number>

export const PRESETS: Record<string, { label: string; template: PointsTemplate; participation: number }> = {
  standard: {
    label: 'Standard',
    template: {
      '1': 25, '2': 20, '3': 16, '4': 13, '5': 11,
      '6': 10, '7': 9, '8': 8, '9': 7, '10': 6, '11': 5, '12': 4,
      default: 2,
    },
    participation: 0,
  },
  flat: {
    label: 'Flat',
    template: {
      '1': 10, '2': 8, '3': 6, '4': 5, '5': 4,
      '6': 3, '7': 3, '8': 3, '9': 2, '10': 2, '11': 2, '12': 2,
      default: 1,
    },
    participation: 0,
  },
  participation: {
    label: 'Participation-heavy',
    template: {
      '1': 15, '2': 12, '3': 10, '4': 8, '5': 6,
      '6': 5, '7': 5, '8': 5, '9': 4, '10': 4, '11': 4, '12': 4,
      default: 3,
    },
    participation: 5,
  },
}
