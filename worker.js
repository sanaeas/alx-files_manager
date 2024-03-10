import Bull from 'bull';
import { promises as fs } from 'fs';
import { imageThumbnail } from 'image-thumbnail';
import dbClient from './utils/db';

const fileQueue = new Bull('fileQueue');
fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  if (userId === undefined) {
    throw new Error('Missing userId');
  }
  if (fileId === undefined) {
    throw new Error('Missing fileId');
  }
  const file = await dbClient.filterBy('files', { fileId, userId });
  if (file === null) {
    throw new Error('File not found');
  }
  const source = file.localPath;
  try {
    console.log('let us create thumbnails');
    const half = await imageThumbnail(source, { width: 500 });
    const quarter = await imageThumbnail(source, { width: 250 });
    const tenth = await imageThumbnail(source, { width: 100 });
    await fs.writeFile(`${source}_500`, half);
    await fs.writeFile(`${source}_250`, quarter);
    await fs.writeFile(`${source}_100`, tenth);
  } catch (err) { console.log(err); }
});
