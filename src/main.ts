import sharp from 'sharp';

import { SQSService } from './aws/sqs.service';
import { ConfigService } from './config.service';
import { DynamoDBService } from './aws/dynamo.service';
import { S3Service } from './aws/s3.service';

const configService = new ConfigService();

const sqsService = new SQSService(configService);
const dynamoDBService = new DynamoDBService(configService);
const s3Service = new S3Service(configService);

async function Run() {
	const messages = await sqsService.getMessagesFromQueue();
	if (messages && messages.length > 0) {
		console.log('Process messages');
		for (const message of messages) {
			let TaskID: string;
			try {
				TaskID = JSON.parse(message.Body!).TaskID;
			} catch (e) {
				console.error('JSON.parse error for TaskID', e);
				return;
			}
			await dynamoDBService.updateItem(TaskID, 'In progress');
			const item = await dynamoDBService.getItem(TaskID);
			if (!item) {
				console.error(`Item by ${TaskID} not found`);
				return;
			}
			const originalFIleObject = await s3Service.getObject(item.OriginalFileKey);
			if (!originalFIleObject?.Body) {
				console.error(`Object by ${item.OriginalFileKey} not found`);
				return;
			}
			const buffer = await originalFIleObject.Body.transformToByteArray();
			const processedObject = await sharp(buffer.buffer).rotate(180).withMetadata().toBuffer();
			const processedObjectKey = await s3Service.putFile(processedObject);
			await dynamoDBService.updateItem(TaskID, 'Done', processedObjectKey);
			console.log('Done. Wait for new messages');
		}
	}
	setTimeout(Run, 3000);
}

Run();
