import { Document } from 'mongoose';

export interface BaseEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export type BaseDocument = Document & BaseEntity;
