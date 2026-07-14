import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import {
  configureApiApplication,
  createOpenApiDocument,
} from '../src/common/swagger/swagger.config';

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  try {
    configureApiApplication(app);
    await app.init();
    const document = createOpenApiDocument(app);
    const output = process.env.OPENAPI_OUTPUT
      ? resolve(process.env.OPENAPI_OUTPUT)
      : resolve(__dirname, '../openapi/openapi.json');
    writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    process.stdout.write(`OpenAPI document written to ${output}\n`);
  } finally {
    await app.close();
  }
}

void generate();
