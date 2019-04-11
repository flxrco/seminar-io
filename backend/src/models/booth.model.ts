import { Schema, model, Document, Types, SchemaTypes } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import { select as seminarSelect, collaborators } from './seminar.model';

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

const Booth = model('Booth', BoothSchema);

interface INewBooth {
    mode: number,
    startAt?: Date,
    endAt: Date
}

export async function create(seminarId: MongooseId, collaboratorId: MongooseId, data: INewBooth): Promise<Document> {
    await collaborators.verify(seminarId, collaboratorId, { canEdit: true });

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
    let booth =  <any> await Booth.findById(boothId).exec();
    
    if (booth == null) {
        throw new Error(`Booth <${ booth.seminarId }> does not exist.`);
    }

    if (booth.deletedAt != null) {
        throw new Error(`Booth <${ booth.seminarId }> has already been deleted.`);
    }
    
    await seminarSelect(booth.seminarId);

    return <Document> booth;
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

export async function modify(boothId: MongooseId, collaboratorId: MongooseId, options: IBoothOptions): Promise<Document> {
    let booth = <any> await select(boothId);
    await collaborators.verify(booth.seminarId, collaboratorId, { canEdit: true });

    if (options.mode != null) {
        booth.mode = options.mode;
    }

    if (options.delete) {
        booth.deletedAt = Date.now();
        booth.deletedBy = parseId(collaboratorId);
    }

    return await (<Document> booth).save();
}