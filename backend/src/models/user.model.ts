import { Schema, model, Document, Types } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import { hash, hashSync, compareSync } from 'bcryptjs';
import * as Joi from 'joi';

const UserSchema = new Schema({
    email: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },

    registeredAt: { type: Date, default: Date.now },

    connections: [ObjectId]
});

const User = model('User', UserSchema);

const UserJoiSchema = Joi.object({
    email: Joi.string().email().required(),
    
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),

    password: Joi.string().min(8).max(36).required()
});

export async function create(newUser: any) {
    Joi.validate(newUser, UserJoiSchema);

    // check if email is unique
    let dupes = await User.find({ email: newUser.email }).exec();
    if (dupes.length > 0) {
        throw new Error(`The email ${ newUser.email } has already been taken by another user.`);
    }

    newUser.password = hashSync(newUser.password);
    return await User.create(newUser);
}

export async function authenticate(email: string, password: string) {
    let user = await User.findOne({ emai: email }).exec();

    if (user == null) {
        throw new Error(`The email ${ email } is not registered.`);
    }

    if (!(compareSync(password, user.get('password', String)))) {
        throw new Error(`Wrong password entered for ${ email }.`);
    }

    return user;
}