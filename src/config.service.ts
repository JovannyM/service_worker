import { config, DotenvParseOutput } from 'dotenv';

export class ConfigService {
	private readonly config!: DotenvParseOutput;

	constructor() {
		this.config = config().parsed as DotenvParseOutput;
	}
	get(key: string): string {
		return this.config[key];
	}
}
