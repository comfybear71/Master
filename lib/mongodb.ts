import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  console.warn("MONGODB_URI not set — database features will be unavailable");
}

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

const globalWithMongo = global as typeof globalThis & { _mongo: MongoCache };

if (!globalWithMongo._mongo) {
  globalWithMongo._mongo = { client: null, promise: null };
}

const cached = globalWithMongo._mongo;

export async function getMongoClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client;
  }
  if (!cached.promise) {
    cached.promise = MongoClient.connect(MONGODB_URI);
  }
  cached.client = await cached.promise;
  return cached.client;
}

export async function getDb(dbName: string = "themaster"): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
