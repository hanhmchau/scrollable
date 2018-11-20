import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { format, parse } from 'date-fns';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import consts from '../../consts';
import GraphInput, { GraphSeries } from '../models/graph-input';
import Ticker from '../models/ticker';

@Injectable({
    providedIn: 'root'
})
export class TickerService {
    constructor(private http: HttpClient) {}

    getClosePrice(
        symbols: string,
        startDate: Date,
        endDate: Date
    ): Observable<GraphInput> {
        let params = new HttpParams().set('symbols', symbols);
        if (startDate) {
            params = params.set(
                'startDate',
                format(startDate, consts.DATE_FORMAT)
            );
        }
        if (endDate) {
            params = params.set('endDate', format(endDate, consts.DATE_FORMAT));
        }
        return this.http
            .get<Ticker[]>(`/api/close-price`, {
                params
            })
            .pipe(
                catchError(err => of(undefined)),
                map((data: any) => {
                    if (data) {
                        const graphInput = new GraphInput();
                        const dataset: any[] = data.prices.dateClose;
                        dataset.forEach(d => {
                            const graphSeries = new GraphSeries();
                            graphSeries.name = d.ticker;
                            d.data.forEach((el: any[]) => {
                                graphSeries.series.push({
                                    label: d.ticker,
                                    name: parse(el[0] as string),
                                    value: el[1] as number
                                });
                            });
                            graphInput.data.push(graphSeries);
                        });

                        return graphInput;
                    }
                })
            );
    }

    searchTickers(search: string): Observable<Ticker[]> {
        const tickerSearchStr = localStorage.getItem(
            consts.CACHE.TICKER_SEARCH
        );
        const cache: any = tickerSearchStr ? JSON.parse(tickerSearchStr) : {};
        const tickersWithThisSearch = cache[search];

        if (tickersWithThisSearch) {
            return of(tickersWithThisSearch);
        }
        return this.queryTickers(search).pipe(
            tap(tickers => {
                cache[search] = tickers;
                localStorage.setItem(
                    consts.CACHE.TICKER_SEARCH,
                    JSON.stringify(cache)
                );
            })
        );
    }

    getFullName(symbol: string): Observable<any> {
        return this.http
            .get<any>(`/api/${symbol}/full-name`)
            .pipe(catchError(err => of(undefined)));
    }

    private queryTickers(search: string): Observable<Ticker[]> {
        if (!search) {
            return of([]);
        }
        const params = new HttpParams().set('search', search).set('top', '5');
        return this.http.get<Ticker[]>('/api/tickers', {
            params
        });
    }
}
