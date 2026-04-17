export type Horse = {
  id: number;
  name: string;
  color: string;
  condition: number;
};

export type HorseId = Horse['id'];
