import * as WebSocket from 'ws';
import { INestApplicationContext, WebSocketAdapter } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';
import { Observable, fromEvent, EMPTY } from 'rxjs';
import { mergeMap, filter } from 'rxjs/operators';
import { v4 } from 'uuid';
import { WsAdapter } from '@nestjs/platform-ws/adapters/ws-adapter';

export class WsAdapterWithID extends WsAdapter implements WebSocketAdapter {

    private connNumber = 0;

    constructor(private app: INestApplicationContext) {
        super(app);
    }

    create(port: number, options: any = {}): any {
        return new WebSocket.Server({ port, ...options });
    }

    bindClientConnect(server, callback: Function) {
        server.on('connection', (ws, req) => {
            ws.socketID = v4();
            ws.connNumber = this.connNumber;
            this.connNumber++;
            callback(ws, req);
        });
    }

    bindMessageHandlers(
        client: WebSocket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        fromEvent(client, 'message')
            .pipe(
            mergeMap(data => this.bindMessageHandler(data, handlers, process)),
            filter(result => result),
            )
            .subscribe(response => client.send(JSON.stringify(response)));
    }

    bindMessageHandler(
        buffer,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ): Observable<any> {
        const message = JSON.parse(buffer.data);
        const messageHandler = handlers.find(
            handler => handler.message === message.event,
        );
        if (!messageHandler) {
            return EMPTY;
        }
        return process(messageHandler.callback(message.data));
    }

    close(server) {
        server.close();
    }

}