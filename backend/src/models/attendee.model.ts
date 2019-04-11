import { Schema, model, Document, Types, SchemaTypes } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import { attendeeFields } from './seminar.model';
import * as Joi from 'joi';

const LoggingSchema = new Schema({
    isBooth: { required: true, type: Boolean },
    id: ObjectId,
    timestamp: { required: true, type: Date, default: Date.now }
});

const AttendeeSchema = new Schema({
    seminarId: { required: true, type: ObjectId },

    registrationLog: LoggingSchema,
    timeInLog: LoggingSchema,
    timeOutLog: LoggingSchema,

    answers: SchemaTypes.Mixed
});

const Attendee = model('Attendee', AttendeeSchema);

export interface ILog {
    isBooth: boolean,
    id: Types.ObjectId,
    timestamp: Date
}

export async function preRegister(seminarId: MongooseId, answers: any): Promise<Document> {
    let schema = await attendeeFields.getSchema(seminarId);
    Joi.validate(answers, schema);

    return await Attendee.create({
        seminarId: parseId(seminarId),
        registrationLog: { isBooth: false },

        answers: answers
    });
}

export namespace boothOperation {
    export async function onSiteRegister(boothId: MongooseId, data: any): Promise<Document> {

    }

    export async function timeIn(boothId: MongooseId, attendeeId: MongooseId): Promise<Document> {

    }

    export async function timeOut(boothId: MongooseId, attendeeId: MongooseId): Promise<Document> {

    }
}

export namespace forcedOperation {
    export async function register(userId: MongooseId, data: any): Promise<Document> {

    }
    
    export async function timeIn(userId: MongooseId, attendeeId: MongooseId): Promise<Document> {

    }
    
    export async function timeOut(userId: MongooseId, attendeeId: MongooseId): Promise<Document> {

    }

    export async function modifyAnswers(userId: MongooseId, attendeeId: MongooseId, answers: data): Promise<Document> {

    }
}