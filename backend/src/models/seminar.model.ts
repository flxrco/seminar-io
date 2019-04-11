import { Schema, model, Document, Types } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';
import * as Joi from 'joi';

const SeminarInfo = new Schema({
    title: { type: String, required: true },
    description: String,
    schedule: {
        start: Date,
        end: Date
    }
}, { _id: false });

const AttendeeField = new Schema({
    _id: {
        type: ObjectId,
        requried: true,
        default: ObjectId()
    },

    name: { type: String, required: true },
    isRequired: { type: Boolean, required: true, default: false },

    inputType: {
        type: String,
        enum: ['text', 'textarea', 'number', 'email', 'checkbox', 'radio', 'select'],
        required: true
    },

    properties: [{
        label: String, // label of checkbox/radio/select options
        optionType: {
            type: String,
            enum: ['text', 'number', 'email']
        },
        config: {
            min: Number,
            max: Number,
            pattern: RegExp
        }
    }]
}, { _id: false });

const SeminarCollaborator = new Schema({
    userId: { type: ObjectId, required: true },
    
    addedBy: { type: ObjectId },
    addedAt: { type: Date, default: Date.now },

    canEdit: { type: Boolean, default: false },
    canManage: { type: Boolean, default: false }
}, { _id: false });

const SeminarSchema = new Schema({
    info: SeminarInfo,
    attendeeFields: [AttendeeField],
    collaborators: [SeminarCollaborator],

    deletedAt: Date,
    deletedBy: ObjectId,

    archivedAt: Date,
    archivedBy: ObjectId
});

const Seminar = model('Seminar', SeminarSchema);


// SEMINAR CREATION
export interface ISeminarInfo {
    title: string,
    description?: string,
    schedule?: {
        start: Date,
        end: Date
    }
}

export async function create(createdBy: MongooseId, seminarData: ISeminarInfo): Promise<Document> {
    createdBy = parseId(createdBy);

    let data: any = seminarData;
    data.collaborators = [{
        userId: createdBy,
        canEdit: true,
        canManage: true
    }];

    return await Seminar.create(data);
}

export async function select(seminarId: MongooseId): Promise<Document> {
    seminarId = parseId(seminarId);
    let seminar = await Seminar.findById(seminarId).exec();
    
    if (seminar == null) {
        throw new Error(`Seminar <${ seminarId.toHexString() }> does not exist.`);
    }

    if (seminar.get('deletedAt') != null) {
        throw new Error(`Seminar <${ seminarId.toHexString() }> has already been deleted.`);
    }

    return seminar;
}

export async function remove(seminarId: MongooseId, authorId: MongooseId): Promise<Document> {
    seminarId = parseId(seminarId);
    await collaborators.verify(seminarId, authorId);
    return await Seminar.findByIdAndUpdate(seminarId, { $set: { deletedBy: seminarId, deletedAt: new Date() } }).exec();
}

export async function updateInfo(seminarId: MongooseId, authorId: MongooseId, data: ISeminarInfo): Promise<Document> {
    seminarId = parseId(seminarId);
    await collaborators.verify(seminarId, authorId);
    return await Seminar.findByIdAndUpdate(seminarId, { $set: { info: data } }).exec();
}

export namespace collaborators {

    export interface ISeminarCollaborator {
        userId: Types.ObjectId,

        createdBy: Types.ObjectId,
        createdAt: Date,

        canEdit: boolean,
        canManage: boolean
    }

    export async function verify(seminar: MongooseId | Document, userId: MongooseId, options?: any): Promise<ISeminarCollaborator> {
        userId = parseId(userId);
        
        if (!(seminar instanceof Document)) {
            seminar = await select(parseId(<MongooseId> seminar));
        }

        userId = parseId(userId);
        
        let collaborators: ISeminarCollaborator[] = (<Document> seminar).toObject().collaborators;
        let collaboratorInfo: ISeminarCollaborator = null;
        
        for (let collaborator of collaborators) {
            if (userId.equals(collaborator.userId)) {
                collaboratorInfo = collaborator;
                break;
            }
        }

        if (!collaboratorInfo) {
            throw new Error(`User <${ userId.toHexString() }> is not a collaborator of seminar <${ (<Document> seminar)._id }>.`);
        }

        if (options) {
            if (options.canEdit && !collaboratorInfo.canEdit) {
                throw new Error(`Collaborator <${ collaboratorInfo.userId.toHexString() }> does not have edit permissions for seminar <${ (<Document> seminar)._id }>.`);
            }

            if (options.canManage && !collaboratorInfo.canManage) {
                throw new Error(`Collaborator <${ collaboratorInfo.userId.toHexString() }> does not have manage permissions for seminar <${ (<Document> seminar)._id }>.`);
            }
        }

        return collaboratorInfo;
    }

    export async function add(seminarId: MongooseId, authorId: MongooseId, userId: MongooseId): Promise<Document> {
        userId = parseId(userId);
        seminarId = parseId(userId);
        
        let seminar = await select(seminarId);
        let existingCollaborator = null;

        await verify(seminar, authorId, { canManage: true });

        try {
            existingCollaborator = await verify(seminarId, userId);
        } catch (error) {
            // proceed if error since we know now that userId is not yet a collaborator of the seminar
        }

        if (existingCollaborator) {
            throw new Error(`User <${ userId.toHexString() }> is already a collaborator of seminar <${ seminarId.toHexString() }>.`);
        }

        (<any> seminar).collaborators.push({
            userId: parseId(userId),

            addedBy: parseId(authorId),
            addedAt: Date.now()
        });

        return await seminar.save();
    }

    interface ICollaboratorOptions {
        canEdit?: boolean,
        canManage?: boolean,
        delete?: boolean
    }

    export async function modify(seminarId: MongooseId, authorId: MongooseId, collaboratorId: MongooseId, options: ICollaboratorOptions): Promise<Document> {
        let seminar = await select(seminarId);
        collaboratorId = parseId(collaboratorId);

        await verify(seminar, authorId, { canManage: true });
        await verify(seminar, collaboratorId);

        let collaborators = <any[]> (<any> seminar).collaborator;
        let index = -1;

        for (let i = 0; i < collaborators.length; i++) {
            let curr = collaborators[i];
            if (collaboratorId.equals(curr.userId)) {
                index = i;
                break;
            }
        }

        if (options.canEdit != null) {
            collaborators[index].canEdit = options.canEdit;
        }

        if (options.canManage != null) {
            collaborators[index].canManage = options.canManage;
        }

        if (options.delete) {
            collaborators.splice(index, 1);
        }

        return await seminar.save();
    }
}

export namespace attendeeFields {
    
    export interface IAttendeeField {
        _id?: Types.ObjectId,
    
        name: string,
        isRequired: boolean,
        inputType: string,
    
        properties: [{
            label: string,
            optionType?: string,
            config?: {
                min?: number,
                max?: number,
                pattern?: RegExp
            }
        }]
    }
    
    export async function update(seminarId: MongooseId, authorId: MongooseId, fields: IAttendeeField[]): Promise<Document> {
        let seminar = await select(seminarId);
        await collaborators.verify(seminar, authorId, { canEdit: true });

        let semObj = <any> seminar;
        let usedNames = new Set();
        for (let field of fields) {
            if (usedNames.has(field.name)) {
                throw new Error(`Field names should be unique. The field name ${ field.name } has been used more than once.`);
            }
            usedNames.add(field.name);
            verify(field);
        }

        semObj.attendeeFields = fields;
        return await seminar.save();
    }

    export function verify(field: IAttendeeField): void {
        switch (field.inputType) {
            case 'text': case 'textarea': case 'number': case 'email': {
                switch (field.inputType) {
                    case 'number': case 'text': {
                        if (field.properties.length > 1) {
                            throw new Error(`Property array length for text, number, and email input types cannot be larger than 1. Found ${ field.properties.length }.`);
                        }

                        break;
                    }
                }

                // textarea and email type is an auto-pass since min-max will be ignored
                return;
            }

            case 'checkbox': case 'radio': case 'select': {
                if (field.properties.length < 1) {
                    throw new Error(`Property array for checkbox, radio, and select cannot have the length of 0.`);
                }

                let hasInput = false;
                let usedLabels = new Set();

                for (let i = 0; i < field.properties.length; i++) {
                    let property = field.properties[i];

                    if (usedLabels.has(property.label)) {
                        throw new Error(`A label cannot be used more than once. Label ${ property.label } has been used more than once.`);
                    }
                    usedLabels.add(property.label);

                    if (!property.label) {
                        throw new Error(`An option cannot be without a label. Error encountered at index ${ i }.`);
                    }

                    if (field.inputType === 'select' && property.optionType) {
                        throw new Error(`Select input types cannot have an input option. Error encountered at index ${ i }.`);
                    }

                    if (field.inputType !== 'select') {
                        if (property.optionType) {
                            if (hasInput) {
                                throw new Error(`There cannot be more than one input option.`);
                            }
                        }
                    }
                }
                return;
            }

            default: {
                throw new Error(`Unrecognized attendee field input type '${ field.inputType }'.`);
            }
        }
    }

    export async function getSchema(seminarId: MongooseId): Promise<Joi.Schema> {
        let seminar = <any> await select(seminarId);
        return generateJoiSchema(seminar.attendeeFields);
    }

    export function generateJoiSchema(fields: IAttendeeField[]): Joi.Schema {
        let schema = <any> {};
    
        for (let field of fields) {
            let fieldSchema = null;

            switch (field.inputType) {
                case 'number': {
                    fieldSchema = Joi.number();
                    if (field.properties.length > 0) {
                        let config = field.properties[0].config;

                        if (config.max != null) {
                            fieldSchema.max(config.max);
                        }

                        if (config.min != null) {
                            fieldSchema.min(config.min);
                        }
                    }

                    break;
                }

                case 'email': case 'text': case 'textarea': {
                    fieldSchema = Joi.string();
                    switch (field.inputType) {
                        case 'email': {
                            fieldSchema.email();
                            break;
                        }

                        case 'text': {
                            if (field.properties.length > 0) {
                                let config = field.properties[0].config;
        
                                if (config.max != null) {
                                    fieldSchema.max(config.max);
                                }
        
                                if (config.min != null) {
                                    fieldSchema.min(config.min);
                                }
                            }

                            break;
                        }
                    }

                    break;
                }

                case 'select': {
                    let validValues: string[] = [];
                    for (let prop of field.properties) {
                        validValues.push(prop.label);
                    }

                    fieldSchema = Joi.string().valid(validValues);

                    break;
                }

                case 'radio': {
                    let validValues: string[] = [];

                    let inputOptionSchema = null;

                    for (let prop of field.properties) {
                        if (!prop.optionType) {
                            validValues.push(prop.label);
                        } else {
                            inputOptionSchema = prop.optionType === 'number' ? Joi.number() : Joi.string();
                            if (prop.config.max != null) {
                                inputOptionSchema.max(prop.config.max);
                            }
    
                            if (prop.config.min != null) {
                                inputOptionSchema.min(prop.config.min);
                            }
                        }
                    }

                    if (inputOptionSchema) {
                        fieldSchema = Joi.alternatives().try(inputOptionSchema, Joi.string().valid(validValues));
                    } else {
                        fieldSchema = Joi.string().valid(validValues);
                    }

                    break;
                }

                case 'checkbox': {
                    let validValues: string[] = [];

                    let inputOptionSchema = null;

                    for (let prop of field.properties) {
                        if (!prop.optionType) {
                            validValues.push(prop.label);
                        } else {
                            inputOptionSchema = prop.optionType === 'number' ? Joi.number() : Joi.string();
                            if (prop.config.max != null) {
                                inputOptionSchema.max(prop.config.max);
                            }
    
                            if (prop.config.min != null) {
                                inputOptionSchema.min(prop.config.min);
                            }
                        }
                    }

                    fieldSchema = Joi.array().items(Joi.object({
                        isInput: Joi.boolean().required(),
                        value: Joi.alternatives(Joi.string().valid(validValues), inputOptionSchema).required()
                    }));
                    break;
                }
            }

            schema[field.name] = field.isRequired ? fieldSchema.required() : fieldSchema.allow(null, undefined);
        }

        return Joi.object(schema);
    }
}

export namespace certificate {

}