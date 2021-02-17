import { SocketWI } from './../gateway/SocketWI';
import { Injectable, Logger } from '@nestjs/common';
import { YoutubeService } from 'src/youtube/youtube.service';

@Injectable()
export class ListService {

    private readonly logger = new Logger(ListService.name);

    public lists: ChanLists = {};
    public timmers: {[chann: string]: NodeJS.Timeout} = {};
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
        if(!this.lists[chann]) {
            return;
        }
        if(this.lists[chann].currentSong) {
            this.youtubeSrv.getVideoData(this.lists[chann].currentSong).subscribe(d => {
                const duration = d?.data?.items[0]?.contentDetails?.duration;
                if(duration) {
                    const msDuration = this.youtubeSrv.processTime(duration) * 1000;
                    console.log('Duration processed: ', d.data.items[0]);
                    this.lists[chann].initAt = (new Date()).getTime();
                    if(this.timmers[chann]) {
                        clearTimeout(this.timmers[chann]);
                    }
                    this.timmers[chann] = setTimeout(() => {
                        console.log('--- Song finished, going next ----');
                        this.next(chann);
                    }, msDuration);
                    this.lists[chann].playing = true;
                    this.sendStartEvent(chann);
                } else {
                    this.logger.error('no se puede obtener detalles de #0  ' + this.lists[chann].currentSong );
                    // console.log(d);
                }
            });
        } else {
            this.next(chann);
        }
    }

    public getSongTime(chann: string) {
        return (new Date()).getTime() - this.lists[chann].initAt;
    }

    public forcePlay(chann: string, link: string): boolean {
        const ytID = this.youtubeSrv.getVideoID(link);
        this.pause(chann);
        if(ytID) {
            this.createList(chann);
            this.lists[chann].playing = true;
            this.lists[chann].currentSong = ytID;
            this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                this.lists[chann].currentTitle = d.data?.items[0]?.snippet?.title;
                this.sendPlaylist(chann);
                this.start(chann);
            });
            return true;
        }
        return false;
    }

    public pause(chann: string): void {
        if(!this.lists[chann]) return;
        clearTimeout(this.timmers[chann]);
        this.lists[chann].playing = false;
        this.sendPause(chann);
    }

    private createList(chann: string) {
        if(!this.lists[chann]) {
            this.lists[chann] = {
                channel: chann, 
                list: [],
                playing: false
            };
        }
    }

    public add(chann: string, link: string): boolean {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            this.aid(chann, ytID);
            return true;
        }
        return false;
    }

    public aid(chann: string, ytID: string) {
        this.createList(chann);
        if(this.lists[chann].currentSong) {
            this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                this.lists[chann].list.push({id: ytID, title: d.data?.items[0]?.snippet?.title});
                this.sendPlaylist(chann);
            });
        } else {
            this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                this.lists[chann].currentSong = ytID;
                this.lists[chann].currentTitle = d.data?.items[0]?.snippet?.title;
                this.sendPlaylist(chann);
            });
        }
    }

    public remove(chann: string, link: string) {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            this.rid(chann, ytID);
            return true;
        }
        return false;
    }

    public rid(chann: string, ytID: string) {
        this.lists[chann].list = this.lists[chann].list.filter(_ytid => _ytid.id != ytID);
        this.sendPlaylist(chann);
    }

    private sendPlaylist(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'PLAYLIST',
            chann,
            list: this.getList(chann)
        });
    }

    private sendStartEvent(chann: string) {
        console.log('send starting to: ', chann);
        this.sendToChannelWatchers(chann, {
            action: 'START',
            chann,
            song: this.lists[chann].currentSong
        });
    }

    private sendPause(chann: string) {
        this.sendToChannelWatchers(chann, {
            chann,
            action: 'PAUSE'
        });
    }

    public next(chann: string) {
        if(this.lists[chann].list.length > 0) {
            const song = this.lists[chann].list.splice(0, 1)[0];
            this.lists[chann].currentSong = song.id;
            this.lists[chann].currentTitle = song.title;
            this.sendPlaylist(chann);
            this.start(chann);
        } else {
            this.logger.error('STOPPED END LIST ' + chann);
            this.lists[chann].playing = false;
            this.lists[chann].currentSong = undefined;
            this.lists[chann].currentTitle = undefined;
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
    public list: {id: string, title: string}[];
    public playing: boolean;
    public currentSong?: string;
    public currentTitle?: string;
    public initAt?: number;
}