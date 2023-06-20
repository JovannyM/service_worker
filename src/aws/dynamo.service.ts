import { DynamoDB, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import {
	AWS_ACCESS_KEY,
	AWS_API_VERSION,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
	AWS_DYNAMO_DB_TABLE_NAME,
	AWS_BUCKET_NAME,
} from '../consts';
import 'reflect-metadata';
import { ConfigService } from '../config.service';
import { successfulRequest, unsuccessfulRequest } from '../utils';

export class DynamoDBService {
	private readonly region: string;
	private readonly tableName: string;
	private readonly dynamoDBClient: DynamoDB;

	constructor(private readonly configService: ConfigService) {
		this.region = this.configService.get(AWS_REGION);
		this.tableName = this.configService.get(AWS_DYNAMO_DB_TABLE_NAME);
		this.dynamoDBClient = this.configureDynamoDBClient();
	}

	public async getItem(taskId: string) {
		const itemDescription = {
			TableName: this.tableName,
			Key: {
				TaskID: { S: taskId },
			},
		};
		try {
			const task = await this.dynamoDBClient.getItem(itemDescription);
			if (task.Item) {
				const bucketName = this.configService.get(AWS_BUCKET_NAME);
				const object = unmarshall(task.Item);
				object.OriginalFileKey = object.FilePath;
				object.FilePath = `https://s3.${this.region}.amazonaws.com/${bucketName}/${object.FilePath}`;
				if (object.ProcessedFilePath) {
					object.ProcessedFileKey = object.ProcessedFilePath;
					object.ProcessedFilePath = `https://s3.${this.region}.amazonaws.com/${bucketName}/${object.ProcessedFilePath}`;
				}
				return object;
			}
			console.log(successfulRequest('get task status'));
			return undefined;
		} catch (e) {
			console.log(unsuccessfulRequest('get task status'), e);
			return undefined;
		}
	}

	public async updateItem(
		taskId: string,
		state: string,
		processedObjectKey?: string,
	): Promise<boolean> {
		const command = new UpdateItemCommand({
			TableName: this.tableName,
			Key: {
				TaskID: { S: taskId },
			},
			AttributeUpdates: {
				State: {
					Value: {
						S: state,
					},
					Action: 'PUT',
				},
				...(processedObjectKey && {
					ProcessedFilePath: {
						Value: {
							S: processedObjectKey,
						},
						Action: 'PUT',
					},
				}),
			},
		});
		try {
			await this.dynamoDBClient.send(command);
			console.log(successfulRequest('update item in dynamo db'));
			return true;
		} catch (e) {
			console.log(unsuccessfulRequest('put item in dynamo db'), e);
			return false;
		}
	}

	private configureDynamoDBClient() {
		const apiVersion = this.configService.get(AWS_API_VERSION);
		const accessKeyId = this.configService.get(AWS_ACCESS_KEY);
		const secretAccessKey = this.configService.get(AWS_SECRET_ACCESS_KEY);
		return new DynamoDB({
			apiVersion,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			region: this.region,
		});
	}
}
