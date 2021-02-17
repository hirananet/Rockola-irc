import { HttpService, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { apiCredentials } from 'src/api-credentials';

@Injectable()
export class YoutubeService {

    constructor(private readonly httpClient: HttpService) {
        
    }

    getVideoData(id: string): Observable<AxiosResponse<any>> {
        return this.httpClient.get('https://www.googleapis.com/youtube/v3/videos?id=' + id + '&part=contentDetails&key=' + apiCredentials.yt3);
    }

    processTime(duration: string) {
        var match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        
        match = match.slice(1).map(function(x) {
            if (x != null) {
                return x.replace(/\D/, '');
            }
        });
        
        var hours = (parseInt(match[0]) || 0);
        var minutes = (parseInt(match[1]) || 0);
        var seconds = (parseInt(match[2]) || 0);
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    getVideoID(link: string): string {
        const youtubeLink = /((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?/.exec(link);
        if (youtubeLink) {
            return youtubeLink[5];
        }
        return undefined;
    }

}

export class YTDetails {
    kind: string;
    etag: string;
    items: YTDetail[];
    pageInfo: YTPageInfo;
}

export class YTDetail {
    kind: string; // youtube#video
    etag: string;
    id: string;
    contentDetails: VideoDetail;
}

export class VideoDetail {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: any;
    projection: string;
}

export class YTPageInfo {
    totalResults: number;
    resultsPerPage: number;
}