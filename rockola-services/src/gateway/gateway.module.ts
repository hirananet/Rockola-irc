import { EventsGateway } from './events.gateway';
import { Module } from '@nestjs/common';
import { ListModule } from 'src/list/list.module';

@Module({
    imports: [
        ListModule
    ],
    providers: [
        EventsGateway
    ],
})
export class GatewayModule { }
