// Every color the code-drawn art uses, in one place, so the art pass in
// milestone 7 can retune the whole farm without hunting through drawing code.

export const PALETTE = {
  wildGrass: '#5f9a3a',
  wildGrassLight: '#67a43f',
  wildGrassDark: '#578f34',
  tuft: '#4c8030',

  farmGrass: '#8bc34a',
  farmGrassAlt: '#85bc45',
  farmEdge: '#6b4a2b',

  trunk: '#7a5230',
  leaves: '#3f7d2a',
  leavesLight: '#4f9334',
  shadow: 'rgba(30, 50, 15, 0.28)',

  highlightFill: 'rgba(255, 252, 220, 0.35)',
  highlightStroke: '#fffbe0',
} as const;
