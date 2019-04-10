import { Types } from 'mongoose';

export type MongooseId = Types.ObjectId | string;

export let ObjectId = Types.ObjectId;

export function parseId(id: MongooseId): Types.ObjectId {
    return id instanceof String ? Types.ObjectId(<string> id) : <Types.ObjectId> id;
}