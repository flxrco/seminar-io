import { Schema, model, Document, Types, MongooseDocument } from 'mongoose';
import { ObjectId, MongooseId, parseId, generateId } from '../utils/model.util';
import * as User from './user.model';
import * as Joi from 'joi';

const Schedule = new Schema({
    start: { type: Date, required: true },
    end: { type: Date, required: true }
}, { _id: false })

const SeminarInfo = new Schema({
    title: { type: String, required: true }, // every seminar must have a title
    description: String, // description can be optional
    schedule: Schedule // if you provide a schedule, the start and end times must be provided
}, { _id: false });

const AttendeeField = new Schema({
    _id: {
        type: ObjectId,
        default: generateId
    },

    name: { type: String, required: true },
    isRequired: { type: Boolean, default: false },

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
            pattern: String
        }
    }]
}, { _id: false });

const SeminarCollaborator = new Schema({
    userId: { type: ObjectId, required: true },
    
    addedBy: { type: ObjectId },
    addedAt: { type: Date, default: Date.now },

    canEdit: { type: Boolean, default: false },
    canManage: { type: Boolean, default: false },
    
    isOwner: { type: Boolean, default: false }
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

SeminarSchema.set('toObject', { minimize: false, versionKey: false });

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

/**
 * Creates a seminar and automatically registers the creator as a collaborator (with owner rights, of course)
 * 
 * @param createdBy the ObjectId of the person who created the seminar
 * @param seminarData the data used to build the seminar
 * 
 * @returns the newly created seminar document
 * 
 * @throws if the userId input in the createdBy parameter has no document associated to it
 */
export async function create(createdBy: MongooseId, seminarData: ISeminarInfo): Promise<Document> {
    createdBy = parseId(createdBy);

    // this will cause an errror to be thrown if the user is nonexistent
    // this block interrupts the code
    await User.select(createdBy);

    let data: any = seminarData;
    let collaborators = [{
        userId: createdBy,
        canEdit: true,
        canManage: true,
        isOwner: true
    }];

    return await Seminar.create({ info: data, collaborators: collaborators });
}

/**
 * Returns the document of the seminar associated with the input seminarId.
 * 
 * @throws if there is no document associated with the seminarId or if the document is flagged as deleted
 * @param seminarId the ObjectId of the seminar to be pulled up
 * 
 * @returns The document of the seminar
 */
export async function select(seminarId: MongooseId): Promise<Document> {
    seminarId = parseId(seminarId);
    let seminar = await Seminar.findById(seminarId).exec();
    
    // this code block can throw an error and interrupt the code
    if (seminar == null || seminar.get('deletedAt', Date) != null) { // throw an error if flag as deleted or nonexistent
        throw new Error(`Seminar <${ seminarId.toHexString() }> does not exist.`);
    }

    return seminar;
}

/**
 * Flags a seminar as deleted. The deleted seminar will not show up in select nor index anymore.
 * @param seminarId the ObjectId of the seminar to be deleted
 * @param authorId the ObjectId of the collaborator (must be owner)
 * 
 * @returns the OBJECT of the removed seminar
 * 
 * @throws if the seminarId is nonexistent or if the collaborator is not the owner, or if the user is not a collaborator at all
 */
export async function remove(seminarId: MongooseId, authorId: MongooseId): Promise<any> {
    seminarId = parseId(seminarId);
    authorId = parseId(authorId);
    
    // this line can interrupt the code. will throw an error if the seminar is nonexistent
    let seminar = await select(seminarId);

    // this block can also interrupt the flow. will throw an error if not a collaborator, or if the collaborator is not the owner
    await collaborators.verify(seminar, authorId, { isOwner: true }); // the isOwner flag is included so that the verify() call will throw an error if the user is not the owner
    
    seminar.set('deletedBy', authorId);
    seminar.set('deletedAt', Date.now());

    return (await seminar.save()).toObject();
}

/**
 * Updates the info subdocument of a seminar
 * @param seminarId the seminar to be updated
 * @param collaboratorId the id of the one editing
 * @param data the new info of the seminar
 * 
 * @returns the newly edited seminar document
 * 
 * @throws if the seminarId is nonexistent, or if the user does not have edit rights over this seminar
 */
export async function updateInfo(seminarId: MongooseId, collaboratorId: MongooseId, data: ISeminarInfo): Promise<Document> {
    seminarId = parseId(seminarId);

    // this line will throw if the user does not have edit rights for this seminar or if the seminar is nonexistent
    await collaborators.verify(seminarId, collaboratorId, { canEdit: true });

    return await Seminar.findByIdAndUpdate(seminarId, { $set: data }).exec();
}

export namespace collaborators {

    export interface ISeminarCollaborator {
        userId: Types.ObjectId,

        createdBy: Types.ObjectId,
        createdAt: Date,

        canEdit: boolean,
        canManage: boolean,
        isOwner: boolean
    }

    interface ICollaboratorVerifyOptions {
        canEdit?: boolean,
        canManage?: boolean,
        isOwner?: boolean
    }

    export async function verify(seminar: MongooseId | Document, userId: MongooseId, options?: ICollaboratorVerifyOptions): Promise<ISeminarCollaborator> {
        userId = parseId(userId);

        if (typeof seminar === 'string' || seminar instanceof Types.ObjectId) {
            seminar = await select(<MongooseId> seminar);
        }

        await User.select(userId);
        
        let collaborators: ISeminarCollaborator[] = (<Document> seminar).get('collaborators');
        let collaboratorInfo: ISeminarCollaborator = null;
        
        for (let collaborator of collaborators) {
            if (userId.equals(collaborator.userId)) {
                collaboratorInfo = collaborator;
                break;
            }
        }

        let seminarId = (<Document> seminar)._id.toHexString();

        if (!collaboratorInfo) {
            throw new Error(`User <${ userId.toHexString() }> is not a collaborator of seminar <${ seminarId }>.`);
        }

        if (options) {
            let collaboratorId = collaboratorInfo.userId.toHexString();
            if (options.isOwner && !collaboratorInfo.isOwner) {
                throw new Error(`Collaborator <${ collaboratorId }> is not the owner of seminar <${ seminarId }>.`);
            }
            
            if (options.canEdit && !collaboratorInfo.canEdit && !collaboratorInfo.isOwner) {
                throw new Error(`Collaborator <${ collaboratorId }> does not have edit permissions for seminar <${ seminarId }>.`);
            }

            if (options.canManage && !collaboratorInfo.canManage && !collaboratorInfo.isOwner) {
                throw new Error(`Collaborator <${ collaboratorId }> does not have manage permissions for seminar <${ seminarId }>.`);
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
        await User.select(userId);

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

    export async function index(seminarId: MongooseId): Promise<any[]> {
        let seminar = await select(seminarId);
        let collaboratorIds: MongooseId[] = [];

        seminar.get('collaborators').forEach((collaborator: any) => {
            collaboratorIds.push(collaborator.userId);
        });

        let users: Document[] = await User.batchSelect(collaboratorIds);
        let userMap = <any> {};
        
        users.forEach((user: Document) => {
            let obj = user.toObject();

            delete obj.password;
            delete obj.verificationId;
            delete obj.connections;
            delete obj.registeredAt;

            userMap[obj._id.toHexString()] = obj;

            delete obj._id;
        });

        let seminarObj = seminar.toObject();
        let collaborators: any[] = [];

        seminarObj.collaborators.forEach((collaborator: any) => {
            collaborators.push({ ...collaborator, ...userMap[collaborator.userId.toHexString()] });
        });

        return collaborators;
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