import { WebSocketGateway } from "@nestjs/websockets/decorators/socket-gateway.decorator";
import { WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets/decorators";
import { Server } from "ws";
import { WSMessageTypes } from "./WSMessageTypes";
import { SocketWI } from "./SocketWI";
import { ListService } from "src/list/list.service";

@WebSocketGateway(3596)
export class EventsGateway {

    @WebSocketServer()
    private server: Server;

    constructor(private listSrv: ListService) {

    }

    @SubscribeMessage(WSMessageTypes.WELCOME) 
    handleWelcome(@MessageBody() data: string, @ConnectedSocket() client: SocketWI) {
        (client as any).on('close', () => {
            this.listSrv.unAssocAll(client);
        });
    }

    @SubscribeMessage(WSMessageTypes.LIST) 
    handleList(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {
        (client as any).send(JSON.stringify({
            action: 'PLAYLIST',
            list: this.listSrv.getList(channelID)
        }));
    }

    @SubscribeMessage(WSMessageTypes.WATCH) 
    handleWatch(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {
        this.listSrv.assoc(channelID, client);
    }

    @SubscribeMessage(WSMessageTypes.UNWATCH) 
    handleUnWatch(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {
        this.listSrv.unAssoc(channelID, client);
    }

}