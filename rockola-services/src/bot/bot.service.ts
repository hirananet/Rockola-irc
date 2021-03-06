import { botEnvironment } from './../bot.environment';
import { ListService } from './../list/list.service';
import { Injectable, Logger } from '@nestjs/common';
import * as irc from 'irc';

@Injectable()
export class BotService {

    private readonly logger = new Logger(BotService.name);

    private client;
    private channelsNicks = {};
    
    constructor(
        private listSrv: ListService
    ) {
        this.client = new irc.Client(botEnvironment.server, botEnvironment.botName, {
            channels: botEnvironment.channels
        });
        this.client.addListener('nick', (oldnick, newnick, channels, message) => {
            if(oldnick == botEnvironment.botName) {
                botEnvironment.botName = newnick;
            }
        });
        this.client.addListener('error', function(message) {
            this.logger.log('error: ', message);
        });
        this.client.addListener("message", (from, to, text, message) => this.onMessage(from, to, text, message));
        this.client.addListener('names', (channel, nicks) => {
            this.channelsNicks[channel.slice(1)] = nicks;
        });
        listSrv.endOfList.subscribe(chann => {
            this.client.say(chann, '@all no quedan más canciones en la lista de reproducción.');
        });
    }

    public onMessage(from: string, to: string, text: string, message: string) {
        let talkingToMe = false;
        let command = '';
        if(botEnvironment.botName == to) {
            // PM
            talkingToMe = true;
            command = text;
        } else {
            // Channel
            talkingToMe = text.indexOf(botEnvironment.botName) === 0;
            command = text.replace(botEnvironment.botName, '').trim();
            const channel = to;
            if(talkingToMe) {
                // me hablan:
                if(command.toLowerCase().indexOf('play') === 0) {
                    const parts = command.split(' ');
                    if(parts[1]) { // con link
                        // verificamos si es op del canal o que onda?
                        if(this.isOp(channel, from)) {
                            this.listSrv.forcePlay(channel, parts[1]).then(r => {
                                if(r) {
                                    this.client.say(channel, from + ', reproduciendo el video. :playlist:');
                                } else {
                                    this.client.say(channel, from + ', no reconozco el link/id de yt.');
                                }
                            }).catch(e => {
                                this.client.say(channel, from + ', oops, ocurrió un error, intenta más tarde.');
                            });
                        } else {
                            this.morePrivsRequired(channel, from, 'HalfOp');
                        }
                    } else { // solo play
                        if(!this.isVoiced(channel, from)) {
                            this.morePrivsRequired(channel, from, 'Voice');
                        } else if(this.listSrv.exists(channel)) {
                            const list = this.listSrv.getList(channel);
                            if(list.playing) {
                                this.client.say(channel, from + ', la lista ya está en reproducción');
                            } else if(list.list.length == 0) {
                                this.client.say(channel, from + ', la lista no tiene temas, agrega uno con add <link> o play <link>');
                            } else {
                                this.listSrv.start(channel);
                                this.client.say(channel, '@todos iniciando rockola :playlist:');
                            }
                        } else {
                            this.client.say(channel, from + ', no hay una lista disponible, por favor use play <link> o add <link> para iniciar una lista.')
                        }
                    }
                    // play link
                    // play without link
                } else if(command.toLowerCase().indexOf('pause') === 0) {
                    if(this.isOp(channel, from)) {
                        if(!this.listSrv.exists(channel) || !this.listSrv.getList(channel).playing) {
                            this.client.say(channel, from + ', la lista ya estaba pausada'); 
                        } else {
                            this.listSrv.pause(channel);
                            this.client.say(channel, from + ', la lista fue pausada');
                        }
                    } else {
                        this.morePrivsRequired(channel, from, 'HalfOp');
                    }
                } else if(command.toLowerCase().indexOf('add') === 0) {
                    if(this.isVoiced(channel, from)) {
                        this.listSrv.add(channel, command.split(' ')[1]).then(res => {
                            if(res) {
                                this.client.say(channel, from + ', agregado a la lista.');
                            } else {
                                this.client.say(channel, from + ', no reconozco ese enlace/id de yt.');
                            }
                        }).catch(e => {
                            this.client.say(channel, from + ', oops, ocurrió un error, intenta más tarde.');
                        });
                    } else {
                        this.morePrivsRequired(channel, from, 'Voice');
                    }
                } else if(command.toLowerCase().indexOf('remove') === 0) {
                    if(this.isOp(channel, from)) {
                        this.listSrv.remove(channel, command.split(' ')[1]).then(r => {
                            if(r) {
                                this.client.say(channel, from + ', eliminado de la lista.');
                            } else {
                                this.client.say(channel, from + ', no reconozco ese enlace/id de yt.');
                            }
                        }).catch(e => {
                            this.client.say(channel, from + ', oops, ocurrió un error, intenta más tarde.');
                        });
                    } else {
                        this.morePrivsRequired(channel, from, 'HalfOp');
                    }
                } else if(command.toLowerCase().indexOf('next') === 0) {
                    if(this.isOp(channel, from)) {
                        const next = this.listSrv.next(channel);
                        if(next) {
                            this.client.say(channel, from + ', avanzando tema.');
                        } else {
                            this.client.say(channel, from + ', no hay mas temas, por favor agrega temas con add <link> o play <link>.');
                        }
                    } else {
                        this.morePrivsRequired(channel, from, 'HalfOp');
                    }
                }
            }
        }
        if(talkingToMe) {
            if(command.toLowerCase().indexOf('join') === 0) {
                const channel = command.split(' ')[1];
                this.client.join(channel);
            }
            if(command.toLowerCase().indexOf('leave') === 0) {
                const channel = command.split(' ')[1];
                this.client.part(channel);
            }
            if(command.toLowerCase().indexOf('ayuda') === 0 || command.indexOf('help') === 0) {
                this.client.say(from, 'Ayuda de la rockola');
                this.client.say(from, 'Comandos en canales y privados:');
                this.client.say(from, '[>] ayuda o help');
                this.client.say(from, '[>] join #canal');
                this.client.say(from, 'Comandos en canales:');
                this.client.say(from, botEnvironment.botName + ' play <reproducir la lista del canal actual>');
                this.client.say(from, botEnvironment.botName + ' play http://linkyoutube <reproducir el tema ignorando la lista y saltando el actual>');
                this.client.say(from, botEnvironment.botName + ' add http://linkyoutube <agregar un link a la lista>');
                this.client.say(from, botEnvironment.botName + ' aid 2DcMBxiW8Uw <agregar un video de youtube por su id>');
                this.client.say(from, botEnvironment.botName + ' next <pasar al siguiente tema de la lista>');
                this.client.say(from, botEnvironment.botName + ' remove http://linkyoutube <eliminar este link de la lista>');
                this.client.say(from, botEnvironment.botName + ' rid 2DcMBxiW8Uw <eliminar este video de la lista>');
                this.client.say(from, botEnvironment.botName + ' pause <detiene la lista de reproducción>');
            }
        }
    }

    public morePrivsRequired(channel: string, user: string, minReq: string) {
        this.client.say(channel, 'Lo siento '+user+' debes tener ' + minReq + ' o superior para poder realizar esta acción.');
    }

    public getChannelUsers(chann: string) {
        if(chann[0] == '#') {
            chann = chann.slice(1);
        }
        return this.channelsNicks[chann];
    }

    public isVoiced(chann: string, nick: string): boolean {
        const users = this.getChannelUsers(chann);
        if(users && users[nick]) {
            const mode = users[nick];
            return mode.indexOf('+') >= 0 || mode.indexOf('&') >= 0 || mode.indexOf('@') >= 0 || mode.indexOf('~') >= 0 || mode.indexOf('%') >= 0;
        }
        return false;
    }

    public isOp(chann: string, nick: string) {
        const users = this.getChannelUsers(chann);
        if(users && users[nick]) {
            const mode = users[nick];
            return mode.indexOf('&') >= 0 || mode.indexOf('@') >= 0 || mode.indexOf('~') >= 0 || mode.indexOf('%') >= 0;
        }
        return false;
    }

}
