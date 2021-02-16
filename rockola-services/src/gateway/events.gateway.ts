import { WebSocketGateway } from "@nestjs/websockets/decorators/socket-gateway.decorator";
import { WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets/decorators";
import { Server } from "ws";
import { WSMessageTypes } from "./WSMessageTypes";
import { SocketWI } from "./SocketWI";
import { Subscription } from "rxjs";
import { ListService } from "src/list/list.service";

@WebSocketGateway(3596)
export class EventsGateway {

    @WebSocketServer()
    private server: Server;

    private listSubscriptions: {[key: string]: {chan: string, sub: Subscription}[]} = {};

    constructor(private listSrv: ListService) {

    }

    @SubscribeMessage(WSMessageTypes.WELCOME) 
    handleWelcome(@MessageBody() data: string, @ConnectedSocket() client: SocketWI) {
        this.listSubscriptions[client.socketID] = [];
        (client as any).on('close', () => {
            this.listSubscriptions[client.socketID].forEach(sub => {
                sub.sub.unsubscribe();
            });
            delete this.listSubscriptions[client.socketID];
        });
    }

    @SubscribeMessage(WSMessageTypes.LIST) 
    handleList(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {

    }

    @SubscribeMessage(WSMessageTypes.WATCH) 
    handleWatch(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {

    }

    @SubscribeMessage(WSMessageTypes.UNWATCH) 
    handleUnWatch(@MessageBody() channelID: string, @ConnectedSocket() client: SocketWI) {

    }

}