import {
    differenceInCalendarDays,
    eachDay,
    format,
    isEqual,
    isWithinRange,
    isToday
} from 'date-fns';
import * as NodeCache from 'node-cache';

export class CacheService {
    private cache: NodeCache;
    private dateFormat = 'YYYY-MM-DD';

    constructor() {
        this.cache = new NodeCache({ stdTTL: 1000, checkperiod: 1200 });
    }

    getDailyStats = (
        ticker: string,
        startDate: Date | string,
        endDate: Date | string,
        specificColumn: number = -1
    ) => {
        const cachedResult: any = this.cache.get(
            this.getKey(ticker, specificColumn)
        );
        let start = format(startDate, this.dateFormat);
        let end = format(endDate, this.dateFormat);
        if (cachedResult) {
            const data = [];
            const cachedBounds = cachedResult.bounds;
            if (!startDate && cachedBounds.start) {
                start = cachedBounds.start;
            }
            if (!endDate && cachedBounds.end) {
                end = cachedBounds.end;
            }
            const cachedDates = cachedResult.dates;
            for (const res in cachedDates) {
                if (cachedDates.hasOwnProperty(res)) {
                    if (isWithinRange(res, start, end)) {
                        data.push([res, cachedDates[res]]);
                    }
                }
            }
            if (differenceInCalendarDays(end, start) + 1 === data.length) {
                const actualData = data.filter(d => d[1] !== -1);
                const realStartDate = actualData.length
                    ? actualData[0][0]
                    : startDate;
                const realEndDate = actualData.length
                    ? actualData[actualData.length - 1][0]
                    : endDate;
                return {
                    start_date: realStartDate,
                    end_date: realEndDate,
                    data: data.filter(d => d[1] !== -1)
                };
            }
        }
    };

    cacheDailyStats = (
        ticker: string,
        startDate: Date | string,
        endDate: Date | string,
        specificColumn: number = -1,
        dataset: any
    ) => {
        const cachedResult: any = this.cache.get(
            this.getKey(ticker, specificColumn)
        );
        const newCacheResult: any = cachedResult || {};
        const bounds = newCacheResult.bounds || {};
        const dates = newCacheResult.dates || {};

        if (!startDate) {
            bounds.start = dataset.start_date;
        }
        if (!endDate) {
            bounds.end = dataset.end_date;
        }

        const dat = dataset.data;
        const receivedStart = format(dataset.start_date, this.dateFormat);
        const receivedEnd = format(dataset.end_date, this.dateFormat);
        let i = 0;
        eachDay(startDate || receivedStart, endDate || receivedEnd).forEach(
            (day: Date) => {
                if (dat[i] && isEqual(dat[i][0], day)) {
                    dates[format(day, this.dateFormat)] = dat[i][1];
                    i++;
                } else {
                    dates[format(day, this.dateFormat)] = -1;
                }
            }
        );
        newCacheResult.dates = dates;
        newCacheResult.bounds = bounds;
        this.cache.set(this.getKey(ticker, specificColumn), newCacheResult);
    };

    getHistoricalData(ticker: string) {
        const cacheKey = `${ticker}-historical`;
        const cachedHistoricalData: any = this.cache.get(cacheKey);
        return cachedHistoricalData;
    }

    cacheHistoricalData(ticker: string, twapValues: any) {
        const cacheKey = `${ticker}-historical`;
        this.cache.set(cacheKey, {
            fetchedDay: new Date(),
            data: twapValues
        });
    }

    private getKey(ticker: string, specificColumn: number = -1) {
        return `${ticker}-${specificColumn}`;
    }
}

export const cache = new CacheService();
