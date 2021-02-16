import { Module } from '@nestjs/common';
import { ListModule } from 'src/list/list.module';

@Module({
    imports: [
        ListModule
    ],
    providers: [
        
    ],
})
export class GatewayModule { }
