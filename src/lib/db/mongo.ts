import { MongoClient, Collection } from 'mongodb';
import type {
  AtendimentoDoc,
  QualityRecordDoc,
  CancellationRecordDoc,
} from './mongo-types';

const uri = process.env.MONGODB_URI;
const DB_NAME = 'dstech_noc';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getMongoClientPromise() {
  if (!uri) {
    throw new Error('MONGODB_URI nao configurada');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }

  return clientPromise;
}

async function getDB() {
  const client = await getMongoClientPromise();
  return client.db(DB_NAME);
}

let atendimentosReady = false;

export async function getAtendimentosCollection(): Promise<Collection<AtendimentoDoc>> {
  const db = await getDB();
  const col = db.collection<AtendimentoDoc>('atendimentos');

  if (!atendimentosReady) {
    await Promise.all([
      col.createIndex({ hashImportacao: 1 }),
      col.createIndex({ tecnicoId: 1 }),
      col.createIndex({ tipo: 1 }),
      col.createIndex({ aberturaAt: 1 }),
      col.createIndex({ cidade: 1 }),
      col.createIndex({ periodYear: 1, periodMonth: 1 }),
    ]);
    atendimentosReady = true;
  }

  return col;
}

let qualityReady = false;

export async function getQualityRecordsCollection(): Promise<Collection<QualityRecordDoc>> {
  const db = await getDB();
  const col = db.collection<QualityRecordDoc>('quality_records');

  if (!qualityReady) {
    await Promise.all([
      col.createIndex({ indicator: 1 }),
      col.createIndex({ technicianId: 1 }),
      col.createIndex({ openedAt: 1 }),
      col.createIndex({ periodYear: 1, periodMonth: 1 }),
    ]);
    qualityReady = true;
  }

  return col;
}

let cancellationsReady = false;

export async function getCancellationRecordsCollection(): Promise<Collection<CancellationRecordDoc>> {
  const db = await getDB();
  const col = db.collection<CancellationRecordDoc>('cancellation_records');

  if (!cancellationsReady) {
    await Promise.all([
      col.createIndex({ cancelledAt: 1 }),
      col.createIndex({ periodYear: 1, periodMonth: 1 }),
      col.createIndex({ city: 1 }),
    ]);
    cancellationsReady = true;
  }

  return col;
}
