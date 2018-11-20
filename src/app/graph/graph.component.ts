import { GraphSeries } from './../models/graph-input';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { subYears, subWeeks, subMonths } from 'date-fns';
import consts from '../../consts';
import GraphInput from '../models/graph-input';
import { TickerService } from './../services/ticker.service';
import { MatSelectChange } from '@angular/material';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-graph-container',
    templateUrl: './graph.component.html',
    styleUrls: ['./graph.component.css']
})
export class GraphComponent {
    private symbol: string;
    private graphInput: GraphInput = new GraphInput();
    private company: any;
    private loading = false;
    private reloading = false;
    private durations = [
        {
            id: '1w',
            label: '1 Week',
            duration: {
                week: 1
            }
        },
        {
            id: '1m',
            label: '1 Month',
            duration: {
                month: 1
            }
        },
        {
            id: '3m',
            label: '3 Months',
            duration: {
                month: 3
            }
        },
        {
            id: '6m',
            label: '6 Months',
            duration: {
                month: 6
            }
        },
        {
            id: '1y',
            label: '1 Year',
            duration: {
                year: 1
            }
        },
        {
            id: '5y',
            label: '5 Years',
            duration: {
                year: 5
            }
        },
        {
            id: 'all',
            label: 'All',
            duration: -1
        }
    ];
    private chosenDuration: any;
    private comparedTickers: string[] = [];
    constructor(
        private tickerService: TickerService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.activatedRoute.paramMap.subscribe(paramMap => {
            this.symbol = paramMap.get('symbol');
            this.chosenDuration = this.durations.find(
                dur => dur.id === '1y'
            ).duration;
            this.comparedTickers.push(this.symbol);
            this.fetchMetadata();
            this.loading = true;
            this.fetchGraphData(this.comparedTickers).subscribe(result => {
                if (result) {
                    this.graphInput = result;
                }
                this.loading = false;
            });
        });
    }

    fetchMetadata() {
        this.tickerService.getFullName(this.symbol).subscribe(data => {
            this.company = data;
        });
    }

    fetchGraphData(symbols: string[]): Observable<GraphInput> {
        const range = this.processRange(this.chosenDuration);
        const startDate: Date = range.start as Date;
        const endDate: Date = range.end as Date;
        const symbol = symbols.join(',');
        return this.tickerService.getClosePrice(symbol, startDate, endDate);
    }

    durationChanged(event: MatSelectChange) {
        this.chosenDuration = event.value;
        this.reloading = true;
        this.fetchGraphData(this.comparedTickers).subscribe(result => {
            if (result) {
                this.graphInput = result;
            }
            this.loading = false;
            this.reloading = false;
        });
    }

    processRange(duration: any): any {
        if (duration === -1) {
            return {
                start: null,
                end: null
            };
        }
        let date = consts.CURRENT_DAY;
        if (duration.week) {
            date = subWeeks(date, duration.week);
        }
        if (duration.month) {
            date = subMonths(date, duration.month);
        }
        if (duration.year) {
            date = subYears(date, duration.year);
        }
        return {
            start: date,
            end: consts.CURRENT_DAY
        };
    }

    addComparison(ticker: string) {
        this.comparedTickers.push(ticker);
        this.fetchGraphData([ticker]).subscribe(result => {
            if (result) {
                this.graphInput.data = [
                    ...this.graphInput.data,
                    result.data[0]
                ];
                this.loading = false;
            }
        });
    }

    deleteComparison(ticker: string) {
        const index = this.comparedTickers.findIndex(t => t === ticker);
        if (index !== -1) {
            this.comparedTickers.splice(index, 1);
            this.graphInput.data = this.graphInput.data.filter(
                series => series.name !== ticker
            );
        }
    }
}
