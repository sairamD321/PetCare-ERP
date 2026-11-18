export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  ownerId: string;
  createdAt?: string;
}

export type PetInput = Omit<Pet, 'id' | 'createdAt'>;
