import { WebSocketGateway } from "@nestjs/websockets/decorators/socket-gateway.decorator";
import { WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets/decorators";
import { Server } from "ws";
import { WSMessageTypes } from "./WSMessageTypes";
import { SocketWI } from "./SocketWI";
import { ListService } from "src/list/list.service";
import { Logger } from "@nestjs/common";

@WebSocketGateway(3001)
export class EventsGateway {

    @WebSocketServer()
    private server: Server;

    private readonly logger = new Logger(EventsGateway.name);

    constructor(private listSrv: ListService) {

    }

    @SubscribeMessage(WSMessageTypes.WELCOME) 
    handleWelcome(@MessageBody() clientName: string, @ConnectedSocket() client: SocketWI) {
        this.logger.log('New client connection: ' + clientName + ':' + client.socketID);
        (client as any).on('close', () => {
            this.listSrv.unAssocAll(client);
            this.logger.log('Client disconnection: ' + clientName + ':' + client.socketID);
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

    @SubscribeMessage(WSMessageTypes.TIME) 
    handleTime(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {
        client.send(JSON.stringify({
            action: 'TIME',
            currentTime: this.listSrv.getSongTime(channelID)
        }));
    }

    @SubscribeMessage(WSMessageTypes.PING) 
    handlePing(@MessageBody() pingID: string, @ConnectedSocket() client: SocketWI) {
        (client as any).send(JSON.stringify({
            action: 'PONG',
            pingID
        }));
    }

}