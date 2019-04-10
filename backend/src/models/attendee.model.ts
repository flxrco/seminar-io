import { Schema, model, Document, Types, SchemaTypes } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import { attendeeFields } from './seminar.model';
import * as Joi from 'joi';

const LoggingSchema = new Schema({
    isBooth: { required: true, type: Boolean },
    id: Types.ObjectId,
    timestamp: { required: true, type: Date, default: Date.now }
});

const AttendeeSchema = new Schema({
    seminarId: { required: true, type: Types.ObjectId },

    registrationLog: LoggingSchema,
    timeInLog: LoggingSchema,
    timeOutLog: LoggingSchema,

    answers: SchemaTypes.Mixed
});

const Attendee = model('Attendee', AttendeeSchema);

export async function preRegister(seminarId: MongooseId, data: any) {
    let schema = await attendeeFields.getSchema(seminarId);
    Joi.validate(data, schema);

    return await Attendee.create({
        seminarId: parseId(seminarId),
        registrationLog: { isBooth: false },

        answers: data
    });
}

export async function onSiteRegister(boothId: MongooseId, data: any) {
}

export async function boothTimeOut(boothId: MongooseId, data: any) {
}

export async function boothTimeIn(boothId: MongooseId, data: any) {
}

export async function forceTimeIn(seminarId: MongooseId, collaboratorId: MongooseId, data: any) {
}

export async function forceTimeOut(seminarId: MongooseId, collaboratorId: MongooseId, data: any) {
}

export async function forceRegister(seminarId: MongooseId, collaboratorId: MongooseId, data: any) {
}