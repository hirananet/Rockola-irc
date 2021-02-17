import { SocketWI } from './../gateway/SocketWI';
import { Injectable } from '@nestjs/common';
import { YoutubeService } from 'src/youtube/youtube.service';

@Injectable()
export class ListService {

    public lists: ChanLists = {};
    public sockets: {[chann: string]: SocketWI[]} = {};

    constructor(private youtubeSrv: YoutubeService) { }

    public assoc(chan: string, socket: SocketWI) {
        if(!this.sockets[chan]) {
            this.sockets[chan] = [];
        }
        this.sockets[chan].push(socket);
    }

    public unAssoc(chan: string, socket: SocketWI) {
        const id = this.sockets[chan].findIndex(sck => sck.socketID === socket.socketID);
        this.sockets[chan].splice(id, 0);
    }

    public unAssocAll(socket: SocketWI) {
        Object.entries(this.sockets).forEach(chanD => {
            const chan = chanD[0];
            const id = this.sockets[chan].findIndex(sck => sck.socketID === socket.socketID);
            this.sockets[chan].splice(id, 0);
        })
    }

    public exists(chann: string): boolean {
        return this.lists[chann] ? true : false;
    }

    public getList(chann: string): ChannelList {
        return this.lists[chann];
    }

    public start(chann: string): void {
        // TODO: controlar tiempo para siguiente canción
        this.lists[chann].playing = true;
        this.sendStartEvent(chann);
    }

    public forcePlay(chann: string, link: string): boolean {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            // TODO: controlar tiempo para siguiente canción
            this.lists[chann].playing = true;
            this.lists[chann].currentSong = ytID;
            this.sendStartEvent(chann);
            return true;
        }
        return false;
    }

    public pause(chann: string): void {
        // TODO: parar tiempo para siguiente canción
        this.lists[chann].playing = false;
        this.sendPause(chann);
    }

    public add(chann: string, link: string): boolean {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            if(this.lists[chann].currentSong) {
                this.lists[chann].list.push(ytID);
            } else {
                this.lists[chann].currentSong = ytID;
            }
            this.sendPlaylist(chann);
            return true;
        }
        return false;
    }

    public remove(chann: string, link: string) {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            this.lists[chann].list = this.lists[chann].list.filter(_ytid => _ytid != ytID);
            this.sendPlaylist(chann);
            return true;
        }
        return false;
    }

    private sendPlaylist(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'PLAYLIST',
            list: this.getList(chann)
        });
    }

    private sendStartEvent(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'START',
            song: this.lists[chann].currentSong
        });
    }

    private sendPause(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'PAUSE'
        });
    }

    public next(chann: string) {
        if(this.lists[chann].list.length > 0) {
            this.lists[chann].currentSong = this.lists[chann].list.splice(0, 1)[0];
            this.sendStartEvent(chann);
            this.sendPlaylist(chann);
        } else {
            this.lists[chann].playing = false;
            this.sendPause(chann);
        }
    }

    public sendToChannelWatchers(chan: string, obj: any) {
        if(!this.sockets[chan]) {
            return;
        }
        this.sockets[chan].forEach((d: any) => {
            d.send(JSON.stringify(obj));
        });
    }
}

export interface ChanLists {
    [channelID: string]: ChannelList;
}

export class ChannelList {
    public channel: string;
    public list: string[];
    public playing: boolean;
    public currentSong: string;
}