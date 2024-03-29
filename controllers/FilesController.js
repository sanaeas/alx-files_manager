import Bull from 'bull';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import dbClient from '../utils/db';
import authUtils from '../utils/auth';

const acceptedTypes = ['folder', 'file', 'image'];
const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const { user } = await authUtils.getUserByToken(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !acceptedTypes.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });
    if (parentId !== 0) {
      const parentIdObj = new ObjectID(parentId);
      const parent = await dbClient.filterBy('files', { _id: parentIdObj });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    const file = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };
    if (type === 'folder') {
      const newFolder = await dbClient.insertInto('files', file);
      file.id = newFolder.insertedId;
      delete file._id;
      return res.status(201).send(file);
    }
    file.localPath = `${folderPath}/${uuidv4()}`;
    fs.mkdirSync(folderPath, { recursive: true });
    fs.writeFileSync(file.localPath, Buffer.from(data, 'base64'));
    const result = await dbClient.insertInto('files', file);

    if (type === 'image') {
      const fileQueue = new Bull('fileQueue');
      fileQueue.add({ userId: user._id, fileId: result.insertedId });
    }
    const newFile = { ...file, id: result.insertedId };
    delete newFile._id;
    delete newFile.localPath;
    return res.status(201).send(newFile);
  }

  static async getShow(req, res) {
    const { user } = await authUtils.getUserByToken(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const fileId = new ObjectID(req.params.id);
    const file = await dbClient.filterBy('files', { _id: fileId, userId: user._id });
    if (!file) return res.status(404).send({ error: 'Not found' });
    file.id = file._id;
    delete file._id;
    return res.status(200).send(file);
  }

  static async getIndex(req, res) {
    const { user } = await authUtils.getUserByToken(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const parentId = req.query.parentId || 0;
    const page = req.query.page || 0;
    const limit = 20;
    const aggregate = [
      { $skip: page * limit },
      { $limit: limit },
    ];
    if (parentId !== 0) aggregate[2] = { $match: { parentId } };
    const docs = await dbClient.db.collection('files').aggregate(aggregate).toArray();
    return res.status(200).send(
      docs.map((doc) => {
        const newDoc = { ...doc, id: doc._id };
        delete newDoc._id;
        delete newDoc.localPath;
        return newDoc;
      }),
    );
  }

  static async putPublish(req, res) {
    const { user } = await authUtils.getUserByToken(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const fileId = new ObjectID(req.params.id);
    const file = await dbClient.filterBy('files', { userId: user._id, _id: fileId });
    if (!file) return res.status(404).send({ error: 'Not found' });
    file.isPublic = true;

    await dbClient.updateOne('files', { _id: fileId }, { isPublic: true });
    res.statusCode = 200;
    return res.send(file);
  }

  static async putUnpublish(req, res) {
    const { user } = await authUtils.getUserByToken(req);
    if (!user) return res.status(401).send({ error: 'Unauthorized' });
    const fileId = new ObjectID(req.params.id);
    const file = await dbClient.filterBy('files', { userId: user._id, _id: fileId });
    if (!file) return res.status(404).send({ error: 'Not found' });
    file.isPublic = false;

    await dbClient.updateOne('files', { _id: fileId }, { isPublic: false });
    res.statusCode = 200;
    return res.send(file);
  }

  static async getFile(req, res) {
    const fileId = new ObjectID(req.params.id);
    const file = await dbClient.filterBy('files', { _id: fileId });
    if (!file) return res.status(404).send({ error: 'Not found' });
    if (!file.isPublic) {
      const { user } = await authUtils.getUserByToken(req);
      if (!user || user._id.toString() !== file.userId.toString()) {
        return res.status(404).send({ error: 'Not found' });
      }
    }
    if (file.type === 'folder') return res.status(400).send({ error: 'A folder doesn\'t have content' });
    try {
      const data = fs.readFileSync(file.localPath);
      const mimetype = mime.lookup(file.name);
      if (mimetype) res.setHeader('Content-Type', mimetype);
      return res.status(200).send(data);
    } catch (err) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
