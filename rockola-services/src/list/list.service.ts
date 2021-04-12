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
                    this.sendPlayEvent(chann);
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

    public forcePlay(chann: string, link: string): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            let ytID = this.youtubeSrv.getVideoID(link);
            this.pause(chann);
            if(!ytID) {
                ytID = link;
            }
            this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                if(d.data?.items[0]?.snippet?.title) {
                    this.createList(chann);
                    this.lists[chann].playing = true;
                    this.lists[chann].currentSong = ytID;
                    this.lists[chann].currentTitle = d.data.items[0].snippet.title;
                    this.sendNewPlaylist(chann);
                    this.start(chann);
                    res(true);
                } else {
                    res(false);
                }
            },e => {
                this.logger.error('Error forcing play', e);
                rej(e);
            });
        });
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

    public async add(chann: string, link: string): Promise<boolean> {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            return this.aid(chann, ytID);
        }
        return this.aid(chann, link);
    }

    private aid(chann: string, ytID: string): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            this.createList(chann);
            if(this.lists[chann].currentSong) {
                this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                    if(d.data?.items[0]?.snippet?.title) {
                        this.lists[chann].list.push({id: ytID, title: d.data?.items[0]?.snippet?.title});
                        this.sendPlaylist(chann);
                        res(true);
                    } else {
                        res(false);
                    }
                }, e => {
                    this.logger.error('Error adding #1 id ' + ytID, e);
                    rej(e);
                });
            } else {
                this.youtubeSrv.getVideoSnippet(ytID).subscribe(d => {
                    if(d.data?.items[0]?.snippet?.title) {
                        this.lists[chann].currentSong = ytID;
                        this.lists[chann].currentTitle = d.data?.items[0]?.snippet?.title;
                        this.sendPlaylist(chann);
                        res(true);
                    } else {
                        res(false);
                    }
                }, e => {
                    this.logger.error('Error adding #2 id ' + ytID, e);
                    rej(e);
                });
            }
        });
    }

    public async remove(chann: string, link: string): Promise<boolean> {
        const ytID = this.youtubeSrv.getVideoID(link);
        if(ytID) {
            return this.rid(chann, ytID);
        }
        return this.rid(chann, link);
    }

    private rid(chann: string, ytID: string): Promise<boolean> {
        return new Promise<boolean>((res, rej) => {
            if(this.lists[chann].list.find(_ytid => _ytid.id != ytID)) {
                this.lists[chann].list = this.lists[chann].list.filter(_ytid => _ytid.id != ytID);
                this.sendPlaylist(chann);
                res(true);
            } else {
                res(false);
            }
        });
    }

    private sendPlaylist(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'PLAYLIST',
            chann,
            list: this.getList(chann)
        });
    }

    private sendNewPlaylist(chann: string) {
        this.sendToChannelWatchers(chann, {
            action: 'NEW_PLAYLIST',
            chann,
            list: this.getList(chann)
        });
    }

    private sendPlayEvent(chann: string) {
        console.log('send play to: ', chann);
        this.sendToChannelWatchers(chann, {
            action: 'PLAY',
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
            return true;
        }
        this.logger.warn('STOPPED END LIST ' + chann);
        this.lists[chann].playing = false;
        this.lists[chann].currentSong = undefined;
        this.lists[chann].currentTitle = undefined;
        this.sendPause(chann);
        return false;
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