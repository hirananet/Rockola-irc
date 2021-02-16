import { Injectable } from '@nestjs/common';

@Injectable()
export class ListService {

    public lists: ChanLists = {};

    public exists(chann: string): boolean {
        return this.lists[chann] ? true : false;
    }

    public getList(chann: string): ChannelList {
        return this.lists[chann];
    }

    public start(chann: string): void {
        this.lists[chann].playing = true;
        // TODO: iniciar lista en watchers.
    }

    public pause(chann: string): void {
        // TODO: pausar los watchers.
        this.lists[chann].playing = false;
    }

    public add(chann: string, link: string) {
        this.lists[chann].list.push(link);
        // TODO: avisar de cambios en la lista
    }

    public remove(chann: string, link: string) {
        this.lists[chann].list = this.lists[chann].list.filter(_link => _link != link);
        // TODO: avisar de cambios en la lista
    }

    public next(chann: string) {
        if(this.lists[chann].list.length > 0) {
            this.lists[chann].currentSong = this.lists[chann].list.splice(0, 1)[0];
            // TODO: avisar de nueva canción
        } else {
            this.lists[chann].playing = false;
        }
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