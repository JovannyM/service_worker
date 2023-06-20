import {
	CreateBucketCommand,
	CreateBucketCommandOutput,
	GetObjectCommand,
	HeadBucketCommand,
	HeadBucketCommandOutput,
	ListBucketsCommand,
	ListBucketsCommandOutput,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

import {
	AWS_ACCESS_KEY,
	AWS_API_VERSION,
	AWS_BUCKET_NAME,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
} from '../consts';
import { ConfigService } from '../config.service';
import { successfulRequest, unsuccessfulRequest } from '../utils';

export class S3Service {
	private readonly region: string;
	private readonly bucketName: string;
	private readonly s3Client: S3Client;

	constructor(private readonly configService: ConfigService) {
		this.region = this.configService.get(AWS_REGION);
		this.bucketName = this.configService.get(AWS_BUCKET_NAME);
		this.s3Client = this.configureS3Client();
	}

	public async getObject(key: string) {
		const command = new GetObjectCommand({
			Bucket: this.bucketName,
			Key: key,
		});
		try {
			const object = await this.s3Client.send(command);
			if (object) {
				return object;
			}
			console.log(`Object by key ${key} not found`);
			return undefined;
		} catch (e) {
			console.log(unsuccessfulRequest('get object'), e);
			return undefined;
		}
	}

	public async putFile(file: Buffer): Promise<string | undefined> {
		const key = uuidv4();
		const putObjectCommand = new PutObjectCommand({
			Bucket: this.bucketName,
			Body: file,
			Key: key,
			ACL: 'public-read-write',
		});
		try {
			await this.s3Client.send(putObjectCommand);
			return key;
		} catch (e) {
			return undefined;
		}
	}

	private configureS3Client(): S3Client {
		const apiVersion = this.configService.get(AWS_API_VERSION);
		const accessKeyId = this.configService.get(AWS_ACCESS_KEY);
		const secretAccessKey = this.configService.get(AWS_SECRET_ACCESS_KEY);
		return new S3Client({
			apiVersion,
			region: this.region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}
}
