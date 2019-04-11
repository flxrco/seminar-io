import { Schema, model, Document, Types, SchemaTypes } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import * as Seminar from './seminar.model';
import * as Joi from 'joi';
import * as Booth from './booth.model';

const LoggingSchema = new Schema({
    isBooth: { required: true, type: Boolean },
    id: ObjectId,
    timestamp: { type: Date, default: Date.now }
});

const AttendeeSchema = new Schema({
    seminarId: { required: true, type: ObjectId },

    registrationLog: LoggingSchema,
    timeInLog: LoggingSchema,
    timeOutLog: LoggingSchema,

    deleteLog: LoggingSchema,

    answers: SchemaTypes.Mixed
});

const Attendee = model('Attendee', AttendeeSchema);

export async function preRegister(seminarId: MongooseId, answers: any): Promise<Document> {
    seminarId = parseId(seminarId);

    let schema = await Seminar.attendeeFields.getSchema(seminarId);
    Joi.validate(answers, schema);

    return await Attendee.create({
        seminarId: parseId(seminarId),
        registrationLog: { isBooth: false },

        answers: answers
    });
}

export async function select(attendeeId: MongooseId): Promise<Document> {
    attendeeId = parseId(attendeeId);

    let attendee = <any> await Attendee.findById(attendeeId).exec();
    if (attendee == null) {
        throw new Error(`Attendee <${ attendeeId.toHexString() }> does not exist.`);
    }

    await Seminar.select(attendee.seminarId);

    if (attendee.deleteLog != null) {
        throw new Error(`Attendee <${ attendeeId.toHexString() }> of seminar <${ attendee.seminarId.toHexString() }> has been deleted.`);
    }

    return <Document> attendee;
}

export namespace boothOperation {
    export async function onSiteRegister(boothId: MongooseId, answers: any): Promise<Document> {
        boothId = parseId(boothId);

        let booth = <any> await Booth.verify(boothId, 0);
        let schema = await Seminar.attendeeFields.getSchema(booth.seminarId);

        Joi.validate(answers, schema);

        return await Attendee.create({
            seminarId: booth.seminarId,
            timeInLog: {
                isBooth: true,
                id: parseId(boothId)
            },
            answers: answers
        });
    }

    export async function timeIn(boothId: MongooseId, attendeeId: MongooseId): Promise<Document> {
        boothId = parseId(boothId);
        attendeeId = parseId(attendeeId);

        await Booth.verify(boothId, 1);
        let attendee = <any> await select(attendeeId);

        if (attendee.timeInLog != null) {
            throw new Error(`Attendee ${ attendeeId.toHexString() } has already timed in.`);
        }

        attendee.timeInLog = {
            isBooth: true,
            id: boothId
        }

        return await (<Document> attendee).save();
    }

    export async function timeOut(boothId: MongooseId, attendeeId: MongooseId): Promise<Document> {
        boothId = parseId(boothId);
        attendeeId = parseId(attendeeId);

        await Booth.verify(boothId, 1);
        let attendee = <any> await select(attendeeId);

        if (attendee.timeInLog == null) {
            throw new Error(`Attendee ${ attendeeId.toHexString() } has not even timed in. Time in first before timing out.`);
        }

        if (attendee.timeOutLog != null) {
            throw new Error(`Attendee ${ attendeeId.toHexString() } has already timed out.`);
        }

        attendee.timeOutLog = {
            isBooth: true,
            id: boothId
        }

        return await (<Document> attendee).save();
    }
}

// export namespace forcedOperation {
//     export async function register(userId: MongooseId, data: any): Promise<Document> {

//     }
    
//     export async function timeIn(userId: MongooseId, attendeeId: MongooseId): Promise<Document> {

//     }
    
//     export async function timeOut(userId: MongooseId, attendeeId: MongooseId): Promise<Document> {

//     }

//     export async function modifyAnswers(userId: MongooseId, attendeeId: MongooseId, answers: data): Promise<Document> {

//     }
// }