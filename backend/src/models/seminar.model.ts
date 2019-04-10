import { Schema, model, Document, Types } from 'mongoose';
import { ObjectId, MongooseId, parseId } from './model.util';

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

    fieldType: {
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
    deletedBy: ObjectId
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

export async function select(seminarId: MongooseId) {
    let seminar = await Seminar.findById(seminarId).exec();
    
    if (seminar == null) {
        throw new Error(`Seminar <${seminarId.toString()}> does not exist.`);
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

        if (options) {
            if (options.canEdit && !collaboratorInfo.canEdit) {
                throw new Error(`Collaborator <${ collaboratorInfo.userId }> does not have edit permissions for seminar <${ (<Document> seminar)._id }>.`);
            }

            if (options.canManage && !collaboratorInfo.canManage) {
                throw new Error(`Collaborator <${ collaboratorInfo.userId }> does not have manage permissions for seminar <${ (<Document> seminar)._id }>.`);
            }
        }

        if (!collaboratorInfo) {
            throw new Error(`User <${ collaboratorInfo.userId }> is not a collaborator of seminar <${ (<Document> seminar)._id }>.`);
        }

        return collaboratorInfo;
    }

    export async function add(seminarId: MongooseId, authorId: MongooseId, userId: MongooseId): Promise<Document> {
        let seminar = await select(seminarId);
        let existingCollaborator = null;

        await verify(seminar, authorId, { canManage: true });

        try {
            existingCollaborator = await verify(seminarId, userId);
        } catch (error) {
            // proceed if error since we know now that userId is not yet a collaborator of the seminar
        }

        if (existingCollaborator) {
            throw new Error(`User <${ userId.toString() }> is already a collaborator of seminar <${ seminarId.toString() }>.`);
        }

        (<any> seminar).collaborators.push({
            userId: parseId(userId),

            addedBy: parseId(authorId),
            addedAt: Date.now()
        });

        return await seminar.save();
    }

    export async function modify(seminarId: MongooseId, authorId: MongooseId, collaboratorId: MongooseId, options: any): Promise<Document> {
        let seminar = await select(seminarId);
        collaboratorId = parseId(collaboratorId);

        await verify(seminar, authorId, { canManage: true });
        await verify(seminar, collaboratorId);

        let semObj = <any> seminar;
        let collaboratorInfo = null;

        for (let collaborator of semObj.collaborators) {
            if (collaboratorId.equals(collaborator.userId)) {
                collaboratorInfo = collaborator;
                break;
            }
        }

        if (options.canEdit != null) {
            collaboratorInfo.canEdit = options.canEdit;
        }

        if (options.canManage != null) {
            collaboratorInfo.canManage = options.canManage;
        }

        return await seminar.save();
    }
}