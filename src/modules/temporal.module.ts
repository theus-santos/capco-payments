import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Connection } from '@temporalio/client';

@Global()
@Module({
  providers: [
    {
      provide: Client,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const connection = await Connection.connect({
          address: config.getOrThrow<string>('TEMPORAL_ADDRESS'),
        });

        return new Client({
          connection,
          namespace: config.getOrThrow<string>('TEMPORAL_NAMESPACE'),
        });
      },
    },
  ],
  exports: [Client],
})
export class TemporalModule {}
