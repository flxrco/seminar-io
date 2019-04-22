import { Schema, model, Document, Types } from 'mongoose';
import { ObjectId, MongooseId, parseId } from '../utils/model.util';
import * as Seminar from './seminar.model';

const BoothSchema = new Schema({
    seminarId: { type: ObjectId, required: true },

    mode: {
        type: Number,
        min: 0,
        max: 2
    },
    
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: ObjectId, required: true },

    deletedAt: Date,
    deletedBy: ObjectId,

    startAt: Date,
    endAt: { type: Date, required: true }
});

BoothSchema.set('toObject', { minimize: false, versionKey: false });

const Booth = model('Booth', BoothSchema);

interface INewBooth {
    mode: number,
    startAt?: Date,
    endAt: Date
}

export async function create(seminarId: MongooseId, collaboratorId: MongooseId, data: INewBooth): Promise<Document> {
    await Seminar.collaborators.verify(seminarId, collaboratorId, { canEdit: true });

    return await Booth.create({
        seminarId: parseId(seminarId),
        mode: data.mode,

        startAt: data.startAt,
        endAt: data.endAt,

        createdAt: Date.now(),
        createdBy: parseId(collaboratorId)
    });
}

export async function select(boothId: MongooseId): Promise<Document> {
    boothId = parseId(boothId);
    let booth = await Booth.findById(boothId).exec();
    
    if (booth == null || booth.get('deletedAt', Date) != null) {
        throw new Error(`Booth <${ boothId.toHexString() }> does not exist.`);
    }
    
    await Seminar.select(booth.get('seminarId'));

    return booth;
}

export async function verify(boothId: MongooseId, mode: number): Promise<Document> {
    if (mode < 0 || mode > 2) {
        throw new Error(`Booth mode can only range up to 0 to 2. Found ${ mode } instead.`);
    }

    let booth = <any> await select(boothId);
    if (booth.mode !== mode) {
        throw new Error(`Booth does not meet mode query. Input mode was ${ mode }. Booth's actual mode is ${ booth.mode }.`);
    }

    return <Document> booth;
}

interface IBoothOptions {
    delete?: boolean,
    mode?: number
}

export async function update(boothId: MongooseId, collaboratorId: MongooseId, options: IBoothOptions): Promise<Document> {
    let booth = <any> await select(boothId);
    await Seminar.collaborators.verify(booth.seminarId, collaboratorId, { canEdit: true });

    if (options.mode != null) {
        booth.mode = options.mode;
    }

    if (options.delete) {
        booth.deletedAt = Date.now();
        booth.deletedBy = parseId(collaboratorId);
    }

    return await (<Document> booth).save();
}

export async function index(seminarId: MongooseId): Promise<Document> {
    await Seminar.select(seminarId);
    let booths = await Booth.find({ seminarId: parseId(seminarId) }).lean();

    let authKeys = authentication.authKeys;
    
    booths.forEach((booth: any) => {
        let authKey = authKeys[booth._id.toHexString()];
        if (authKey) {
            booth.key = {
                id: authKey.key,
                timestamp: authKey.key.getTimestamp()
            }
        }
    });

    return booths;
}

export namespace authentication {

    export const authKeys: any = {};
    const activeBooths: any = {};

    export async function authenticate(boothId: MongooseId, key: MongooseId) {
        boothId = parseId(boothId);
        let boothIdString = boothId.toString();
        let booth = await select(boothId);

        // check booth end time

        let authObject = authKeys[boothIdString];

        if (!authObject) {
            throw new Error(`Booth <${ boothIdString }> has not yet been given an authentication key.`);
        }

        if (!authObject.key.equals(key)) {
            throw new Error(`Incorrect key entered for Booth <${ boothIdString }>.`);
        }

        delete authKeys[boothIdString];
        activeBooths[boothIdString] = new Date();

        return booth;
    }

    export async function generateKey(boothId: MongooseId, collaboratorId: MongooseId): Promise<Types.ObjectId> {
        boothId = parseId(boothId);
        let boothIdString = boothId.toString();
        let booth = await select(boothId);

        // check end time

        await Seminar.collaborators.verify(booth.get('seminarId', Types.ObjectId), collaboratorId, { canEdit: true });
    
        if (activeBooths.hasOwnProperty(boothIdString)) {
            throw new Error(`Booth <${ boothIdString }> is currently in use!`);
        }

        if (authKeys.hasOwnProperty(boothIdString)) {
            authKeys[boothIdString].forceExpire();
        }

        let authKey = Types.ObjectId();

        let timeout = setTimeout(() => {
            delete authKeys[boothIdString];
        }, 180000);

        authKeys[boothIdString] = {
            key: authKey,
            forceExpire: () => {
                clearTimeout(timeout);
                delete authKeys[boothIdString];
            }
        }

        return authKey;
    }

    export async function deauth(boothId: MongooseId): Promise<Document> {
        boothId = parseId(boothId);
        let boothIdString = boothId.toHexString();
        let booth = await select(boothId);

        if (!activeBooths.hasOwnProperty(boothIdString)) {
            throw new Error(`Booth <${ boothIdString }> is not even in use at the moment.`);
        }

        delete activeBooths[boothIdString];

        return booth;
    }
}