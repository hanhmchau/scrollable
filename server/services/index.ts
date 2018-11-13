import axios from 'axios';
import { addDays, differenceInCalendarDays, eachDay, format, isEqual, isWithinRange, parse } from 'date-fns';
import * as fs from 'fs';
import * as NodeCache from 'node-cache';
import * as path from 'path';
import { promisify } from 'util';
import consts from '../consts';
import Error from '../models/error';
const dateFormat = 'YYYY-MM-DD';
const quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

const readFile = promisify(fs.readFile);

export const getTickers = async (search: string, top: number) => {
    const data = await readFile(path.join(__dirname, '../tickers.json'));
    let tickers: any[] = JSON.parse(data.toString()).sort((a: any, b: any) => {
        const tickerA: string = a.ticker;
        const tickerB: string = b.ticker;
        return tickerA.localeCompare(tickerB);
    });
    if (search) {
        tickers = tickers.filter(ticker =>
            (ticker.ticker as string).includes(search)
        );
    }
    if (top) {
        tickers = tickers.slice(0, top);
    }
    console.log(tickers);
    return tickers;
};

export const createError = (e: any) => {
    try {
        const data = e.response.data;
        const message = data.quandl_error
            ? data.quandl_error.message
            : undefined;
        delete data.quandl_error;
        return new Error(message, data.errors);
    } catch (e) {}
};

const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
        return date;
    }
    return format(date, dateFormat);
};

const extractFromCache = (
    ticker: string,
    startDate: Date | string,
    endDate: Date | string
) => {
    const cachedResult: any = cache.get(ticker);
    let start = format(startDate, dateFormat);
    let end = format(endDate, dateFormat);
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

const cacheResult = (
    ticker: string,
    startDate: Date | string,
    endDate: Date | string,
    dataset: any
) => {
    const cachedResult: any = cache.get(ticker);
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
    const receivedStart = format(dataset.start_date, dateFormat);
    const receivedEnd = format(dataset.end_date, dateFormat);
    let i = 0;
    eachDay(startDate || receivedStart, endDate || receivedEnd).forEach(day => {
        if (dat[i] && isEqual(dat[i][0], day)) {
            dates[format(day, dateFormat)] = dat[i][1];
            i++;
        } else {
            dates[format(day, dateFormat)] = -1;
        }
    });
    newCacheResult.dates = dates;
    newCacheResult.bounds = bounds;
    cache.set(ticker, newCacheResult);
};

const getEndOfDays = async (
    ticker: string,
    startDate: Date | string,
    endDate: Date | string
) => {
    const cachedResult = extractFromCache(ticker, startDate, endDate);
    if (cachedResult) {
        return cachedResult;
    }

    const response = await axios.get(`${quandlUrl}/${ticker}/data.json`, {
        params: {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            order: 'asc',
            api_key: process.env.QUANDL_API,
            column_index: consts.COLUMN_INDEX.END_OF_DAY
        }
    });
    const dataset = response.data.dataset_data;
    cacheResult(ticker, startDate, endDate, dataset);
    return response.data.dataset_data;
};

export const movingDayAverage = async (
    ticker: string,
    startDate: Date | string,
    days: number
) => {
    try {
        if (startDate) {
            const mda = await getAverage(ticker, formatDate(startDate), days);
            if (mda) {
                return {
                    succeeded: true,
                    data: {
                        '200dma': {
                            ticker,
                            average: mda
                        }
                    }
                };
            }
        }
        const date = await firstAvailableDate(ticker);
        const msg = startDate
            ? 'There is no data in your specified range.'
            : 'Start date parameter is missing. Please check your API syntax and try again.';
        return {
            succeeded: false,
            data: new Error(msg, {
                first_possible_date: date
            })
        };
    } catch (e) {
        return {
            succeeded: false,
            data: createError(e)
        };
    }
};

export const closePrice = async (
    ticker: string,
    startDate: Date | string,
    endDate: Date | string
) => {
    const dataset = await getEndOfDays(ticker, startDate, endDate);
    return {
        startDate: dataset.start_date,
        endDate: dataset.end_date,
        data: dataset.data
    };
};

const getAverage = async (
    ticker: string,
    startDate: Date | string,
    days: number
) => {
    const endDate = addDays(startDate, days);
    const result = await getEndOfDays(ticker, startDate, endDate);
    const dataset = result.data;
    if (dataset.length) {
        return (
            dataset.reduce((prev: number, curr: any[]) => prev + curr[1], 0) /
            dataset.length
        );
    }
};

const firstAvailableDate = async (ticker: string) => {
    const result = await axios.get(`${quandlUrl}/${ticker}/metadata.json`, {
        params: {
            order: 'asc',
            api_key: process.env.QUANDL_API
        }
    });
    return parse(result.data.dataset.oldest_available_date);
};
