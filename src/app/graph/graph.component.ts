import { GraphSeries } from './../models/graph-input';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { subYears, subWeeks, subMonths } from 'date-fns';
import consts from '../../consts';
import GraphInput from '../models/graph-input';
import { TickerService } from './../services/ticker.service';
import { MatSelectChange } from '@angular/material';

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
            this.fetchGraphData(
                this.symbol,
                subYears(consts.CURRENT_DAY, 1),
                consts.CURRENT_DAY
            );
        });
    }

    fetchMetadata() {
        this.tickerService.getFullName(this.symbol).subscribe(data => {
            this.company = data;
        });
    }

    fetchGraphData(symbol: string, startDate: Date, endDate: Date): void {
        this.tickerService
            .getClosePrice(symbol, startDate, endDate)
            .subscribe((result: GraphSeries) => {
                if (result) {
                    const graphSeries = this.graphInput.data.filter(
                        series => series.name !== symbol
                    );
                    this.graphInput.data = graphSeries;
                    graphSeries.push(result);
                    this.loading = false;
                    this.reloading = false;
                }
            });
    }

    durationChanged(event: MatSelectChange) {
        this.chosenDuration = event.value;
        let startDate: Date = null;
        let endDate: Date = null;
        if (this.chosenDuration !== -1) {
            startDate = this.processStartDate(
                consts.CURRENT_DAY,
                this.chosenDuration
            );
            endDate = consts.CURRENT_DAY;
        }
        this.reloading = true;
        this.comparedTickers.forEach(ticker => {
            this.fetchGraphData(ticker, startDate, endDate);
        });
    }

    processStartDate(endDate: Date, duration: any): Date {
        let date = endDate;
        if (duration.week) {
            date = subWeeks(date, duration.week);
        }
        if (duration.month) {
            date = subMonths(date, duration.month);
        }
        if (duration.year) {
            date = subYears(date, duration.year);
        }
        return date;
    }

    addComparison(ticker: string) {
        this.comparedTickers.push(ticker);
        this.fetchGraphData(
            ticker,
            this.processStartDate(consts.CURRENT_DAY, this.chosenDuration),
            consts.CURRENT_DAY
        );
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
