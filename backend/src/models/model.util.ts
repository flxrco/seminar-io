import { Types, Schema } from 'mongoose';

export type MongooseId = Types.ObjectId | string; // a utility joint type for ObjectId and string

export let ObjectId = Schema.Types.ObjectId; // this ObjectId refers to the kind that can be used for schemas

/**
 * Parses an ObjectId. Accepts string or ObjectId.
 * If the input is already an ObjectId, this function does nothing. However, if the input is a string,
 * the funtion will try to parse it.
 * @param id can be a string or an ObjectId itself
 * @returns the ObjectId representation of the ObjectId string/object
 */
export function parseId(id: MongooseId): Types.ObjectId {
    return id instanceof String ? Types.ObjectId(<string> id) : <Types.ObjectId> id;
}

export function generateId(): Types.ObjectId {
    return Types.ObjectId();
}