declare module "minio" {
  import { Readable } from "stream";

  export interface ClientOptions {
    endPoint: string;
    port?: number;
    accessKey: string;
    secretKey: string;
    useSSL?: boolean;
    region?: string;
    transport?: unknown;
    sessionToken?: string;
    partSize?: number;
    pathStyle?: boolean;
  }

  export interface BucketItem {
    name: string;
    prefix: string;
    size: number;
    etag: string;
    lastModified: Date;
  }

  export class Client {
    constructor(options: ClientOptions);
    bucketExists(bucketName: string): Promise<boolean>;
    makeBucket(bucketName: string, region?: string): Promise<void>;
    putObject(
      bucketName: string,
      objectName: string,
      stream: Buffer | Readable | string,
      size?: number,
      metaData?: Record<string, unknown>,
    ): Promise<{ etag: string; versionId?: string }>;
    getObject(bucketName: string, objectName: string): Promise<Readable>;
    statObject(bucketName: string, objectName: string): Promise<{
      size: number;
      etag: string;
      metaData: Record<string, unknown>;
      lastModified: Date;
    }>;
    removeObject(bucketName: string, objectName: string): Promise<void>;
    listObjects(
      bucketName: string,
      prefix?: string,
    ): AsyncIterable<BucketItem>;
    presignedUrl(
      httpMethod: string,
      bucketName: string,
      objectName: string,
      expires?: number,
      reqParams?: Record<string, unknown>,
      requestDate?: Date,
    ): Promise<string>;
  }
}