import { Schema, model, Document, Types } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import { hashSync, compareSync } from 'bcryptjs';
import * as Joi from 'joi';

const UserSchema = new Schema({
    email: { type: String, required: true },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },

    registeredAt: { type: Date, default: Date.now },
    deletedAt: Date,

    connections: [ObjectId],
    verificationId: { type: ObjectId, default: ObjectId() }
});

const User = model('User', UserSchema);

const UserJoiSchema = Joi.object({
    email: Joi.string().email().required(),
    
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),

    password: Joi.string().min(8).max(36).required()
});

export async function create(newUser: any): Promise<Document> {
    Joi.validate(newUser, UserJoiSchema);

    // check if email is unique
    let dupes = await User.find({ email: newUser.email }).exec();
    if (dupes.length > 0) {
        throw new Error(`The email ${ newUser.email } has already been taken by another user.`);
    }

    newUser.password = hashSync(newUser.password);
    return await User.create(newUser);
}

export async function authenticate(email: string, password: string): Promise<any> {
    let user = await User.findOne({ email: email }).exec();

    if (user == null) {
        throw new Error(`The email ${ email } is not registered.`);
    }

    if (!(compareSync(password, user.get('password', String)))) {
        throw new Error(`Wrong password entered for ${ email }.`);
    }

    return user;
}

export async function select(userId: MongooseId): Promise<Document> {
    userId = parseId(userId);
    let user = await User.findOne({ _id: userId, deletedAt: null }).exec();
    if (user == null) {
        throw new Error(`User <${ userId.toHexString() }> does not exist.`);
    }

    return user;
}

export namespace emailVerification {
    export async function verify(verificationId: MongooseId) {
        verificationId = parseId(verificationId);

        let user = await User.findOne({ verificationId: verificationId, deletedAt: null }).exec();
        (<any> user).verificationId = null;

        return await user.save();
    }

    export async function generateId(userId: MongooseId) {
        userId = parseId(userId);
        let user = <any> await select(userId);

        if (user.verificationId != null) {
            throw new Error(`User <${ userId.toHexString() }> has already been verified.`);
        }

        user.verificationid = ObjectId();

        return await (<Document> user).save();
    }
}