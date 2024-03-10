import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '27017';
const dbName = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    this.connected = false;

    this.client.connect().then(() => {
      this.connected = true;
      this.db = this.client.db(dbName);
    }).catch((err) => {
      console.error('Error connecting to MongoDB:', err);
    });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    try {
      const nbDocs = await this.db.collection('users').estimatedDocumentCount();
      return nbDocs;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async nbFiles() {
    try {
      const nbDocs = await this.db.collection('files').estimatedDocumentCount();
      return nbDocs;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async filterBy(collection, query) {
    try {
      const result = await this.db.collection(collection).findOne(query);
      return result;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async insertInto(collection, obj) {
    try {
      const res = await this.db.collection(collection).insertOne(obj);
      return res;
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  async updateOne(collection, query, update) {
    try {
      const res = await this.db
        .collection(collection)
        .updateOne(query, { $set: update });
      return res;
    } catch (err) {
      console.log(err);
      return null;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
