import {
	DeleteMessageCommand,
	Message,
	ReceiveMessageCommand,
	SQSClient,
} from '@aws-sdk/client-sqs';

import {
	AWS_ACCESS_KEY,
	AWS_API_VERSION,
	AWS_REGION,
	AWS_SECRET_ACCESS_KEY,
	AWS_SQS_QUEUE_NAME,
	AWS_SQS_QUEUE_URL,
} from '../consts';
import { ConfigService } from '../config.service';
import { successfulRequest, unsuccessfulRequest } from '../utils';

import 'reflect-metadata';

export class SQSService {
	private readonly region: string;
	private readonly queueURL: string;
	private readonly queueName: string;
	private readonly sqsClient: SQSClient;

	constructor(private readonly configService: ConfigService) {
		this.region = this.configService.get(AWS_REGION);
		this.queueURL = this.configService.get(AWS_SQS_QUEUE_URL);
		this.queueName = this.configService.get(AWS_SQS_QUEUE_NAME);

		this.sqsClient = this.createSQSClient();
	}

	public async getMessagesFromQueue(): Promise<Message[] | undefined> {
		const command = new ReceiveMessageCommand({
			QueueUrl: this.queueURL,
			MaxNumberOfMessages: 10,
		});
		try {
			const messages = await this.sqsClient.send(command);
			if (messages && messages.Messages && messages.Messages.length > 0) {
				console.log('*******************************************');
				for (const message of messages.Messages) {
					await this.removeMessageFromQueue(message.ReceiptHandle!);
				}
				console.log(`Found ${messages.Messages.length} and removed from queue`);
				console.log(successfulRequest('get messages from queue'));
				return messages.Messages;
			}
			console.log('000000000000000000');
			console.log('Message not found');
			return undefined;
		} catch (e) {
			console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
			console.log(unsuccessfulRequest('get messages from queue'), e);
			return undefined;
		}
	}

	private async removeMessageFromQueue(receiptHandle: string): Promise<boolean> {
		const command = new DeleteMessageCommand({
			QueueUrl: this.queueURL,
			ReceiptHandle: receiptHandle,
		});
		try {
			await this.sqsClient.send(command);
			console.log(successfulRequest('remove message from queue'));
			return true;
		} catch (e) {
			console.log(unsuccessfulRequest('remove message from queue'));
			return false;
		}
	}

	private createSQSClient() {
		const apiVersion = this.configService.get(AWS_API_VERSION);
		const accessKeyId = this.configService.get(AWS_ACCESS_KEY);
		const secretAccessKey = this.configService.get(AWS_SECRET_ACCESS_KEY);
		return new SQSClient({
			apiVersion,
			region: this.region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}
}
