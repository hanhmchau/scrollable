import axios from 'axios';
import {
    addDays,
    differenceInCalendarDays,
    eachDay,
    format,
    isEqual,
    isToday,
    isWithinRange,
    parse
} from 'date-fns';
import * as fs from 'fs';
import { parse as json2csv } from 'json2csv';
import * as NodeCache from 'node-cache';
import * as path from 'path';
import { promisify } from 'util';
import consts from '../consts';
import Error from '../models/error';
import { LMWACalculator } from './../utils/lwma';
import { SMACalculator } from './../utils/sma';
const dateFormat = 'YYYY-MM-DD';
const quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

export const getFullName = async (symbol: string) => {
    const data = await readFile(path.join(__dirname, '../tickers.json'));
    const tickers: any[] = JSON.parse(data.toString());
    const comp = tickers.find(t => t.symbol === symbol);
    if (!comp) {
        return;
    }
    const name = comp.company as string;
    comp.company = name.includes('(')
        ? name.substring(0, name.indexOf('(')).trim()
        : name;
    return comp;
};

const readFile = promisify(fs.readFile);

export const getTickers = async (search: string, top: number) => {
    const data = await readFile(path.join(__dirname, '../tickers.json'));
    let tickers: any[] = JSON.parse(data.toString()).sort((a: any, b: any) => {
        const tickerA: string = a.symbol;
        const tickerB: string = b.symbol;
        if (tickerA.startsWith(search.toUpperCase())) {
            return -1;
        }
        if (tickerB.startsWith(search.toUpperCase())) {
            return 1;
        }
        return tickerA.localeCompare(tickerB);
    });
    if (search) {
        tickers = tickers.filter(
            ticker =>
                (ticker.symbol as string).includes(search.toUpperCase()) ||
                (ticker.company as string)
                    .toLowerCase()
                    .includes(search.toLowerCase())
        );
    }
    if (top) {
        tickers = tickers.slice(0, top);
    }
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

const formatDate = (date: Date | string | undefined) => {
    if (typeof date === 'string' || !date) {
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
    startDate?: Date | string | undefined,
    endDate?: Date | string | undefined,
    specificColumn?: number | undefined
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
            column_index: specificColumn
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
    tickerStr: string,
    startDate: Date | string,
    endDate: Date | string
) => {
    const tickers = tickerStr.split(',');
    const data = [];
    for (const ticker of tickers) {
        const dataset = await getEndOfDays(
            ticker,
            startDate,
            endDate,
            consts.COLUMN_INDEX.END_OF_DAY
        );
        data.push({
            ticker,
            startDate: dataset.start_date,
            endDate: dataset.end_date,
            data: dataset.data
        });
    }
    return data;
};

const getAverage = async (
    ticker: string,
    startDate: Date | string,
    days: number
) => {
    const endDate = addDays(startDate, days);
    const result = await getEndOfDays(
        ticker,
        startDate,
        endDate,
        consts.COLUMN_INDEX.END_OF_DAY
    );
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

export const generateHistoricalData = async (
    ticker: string,
    fileFormat: string
) => {
    const data = await getHistoricalData(ticker);
    let content;
    const fileName = `${ticker}.${fileFormat.toLowerCase()}`;
    switch (fileFormat.toLowerCase()) {
        case 'json':
            content = JSON.stringify(data);
            break;
        case 'csv':
            content = json2csv(data);
            break;
    }
    return {
        content,
        fileName
    };
};

const getHistoricalData = async (ticker: string) => {
    const cacheKey = `${ticker}-historical`;
    const cachedHistoricalData: any = cache.get(cacheKey);
    if (cachedHistoricalData && isToday(cachedHistoricalData.fetchedDay)) {
        return cachedHistoricalData.data;
    }
    let twapValues;
    if (!cachedHistoricalData) {
        const dataset = await getEndOfDays(ticker);
        const data: any[][] = dataset.data;
        twapValues = calculateTwapValues(data);
    } else {
        const dataset = await getEndOfDays(
            ticker,
            addDays(cachedHistoricalData.fetchedDay, 1)
        );
        const data: any[][] = [...cachedHistoricalData.data, ...dataset.data];
        twapValues = calculateTwapValues(data);
    }
    cache.set(cacheKey, {
        fetchedDay: new Date(),
        data: twapValues
    });
    return twapValues;
};

const calculateTwapValues = async (data: any[]) => {
    const content: any[] = [];
    let twapOpen = 0;
    let twapHigh = 0;
    let twapLow = 0;
    let twapClose = 0;
    const sma50: SMACalculator = new SMACalculator(50);
    const sma200: SMACalculator = new SMACalculator(200);
    const lwma15: LMWACalculator = new LMWACalculator(15);
    const lwma50: LMWACalculator = new LMWACalculator(50);
    data.forEach((day, index) => {
        const date = day[0];
        const open = day[1];
        const high = day[2];
        const low = day[3];
        const close = day[4];
        const volume = day[5];
        const todayTwapOpen = (twapOpen += open) / (index + 1);
        const todayTwapHigh = (twapHigh += high) / (index + 1);
        const todayTwapLow = (twapLow += low) / (index + 1);
        const todayTwapClose = (twapClose += close) / (index + 1);
        sma50.push(close);
        sma200.push(close);
        lwma15.push(close);
        lwma50.push(close);
        const obj = {
            date,
            open,
            high,
            low,
            close,
            volume,
            twapOpen: +todayTwapOpen.toFixed(2), // round to two decimal places, + to convert to number
            twapHigh: +todayTwapHigh.toFixed(2),
            twapLow: +todayTwapLow.toFixed(2),
            twapClose: +todayTwapClose.toFixed(2),
            sma50: sma50.getSimpleMovingAvg(),
            sma200: sma200.getSimpleMovingAvg(),
            lwma15: lwma15.getSimpleMovingAvg(),
            lwma50: lwma50.getSimpleMovingAvg()
        };
        content.push(obj);
    });
    return content;
};

const linifyObject = ({
    status,
    date,
    ticker,
    open,
    high,
    low,
    close,
    volume,
    sma50,
    sma200
}: any): string => {
    return `${status},${ticker},${date},${open},${high},${low},${close},${volume},${sma50},${sma200}`;
};

export const generateAlertData = async (ticker: string) => {
    const data = await getAlertData(ticker);
    return data.map(obj => linifyObject(obj)).join('\n');
};

const getAlertData = async (ticker: string): Promise<any[]> => {
    const cacheKey = `${ticker}-alert`;
    const cachedData: any = cache.get(cacheKey);
    if (cachedData && isToday(cachedData.fetchedDay)) {
        return cachedData.data;
    }
    let twapValues;
    if (!cachedData) {
        const dataset = await getEndOfDays(ticker);
        const data: any[][] = dataset.data;
        twapValues = calculateAlertData(data, ticker);
    } else {
        const dataset = await getEndOfDays(
            ticker,
            addDays(cachedData.fetchedDay, 1)
        );
        const data: any[][] = [...cachedData.data, ...dataset.data];
        twapValues = calculateAlertData(data, ticker);
    }
    cache.set(cacheKey, {
        fetchedDay: new Date(),
        data: twapValues
    });
    return twapValues;
};

const calculateAlertData = async (
    data: any[],
    ticker: string
): Promise<any[]> => {
    const content: any[] = [];
    const sma50: SMACalculator = new SMACalculator(50);
    const smva50: SMACalculator = new SMACalculator(50);
    const sma200: SMACalculator = new SMACalculator(200);
    data.forEach((day, index) => {
        const date = day[0];
        const open = day[1];
        const high = day[2];
        const low = day[3];
        const close = day[4];
        const volume = day[5];
        sma50.push(close);
        sma200.push(close);
        smva50.push(volume);
        const sma50avg = sma50.getSimpleMovingAvg();
        const sma200avg = sma200.getSimpleMovingAvg();
        const smva50avg = smva50.getSimpleMovingAvg();
        const obj = {
            date,
            ticker,
            open,
            high,
            low,
            close,
            volume,
            sma50: sma50.getSimpleMovingAvg(),
            sma200: sma200.getSimpleMovingAvg()
        };
        if (sma50avg < sma200avg) {
            content.push({
                ...obj,
                status: 'bearish'
            });
        } else {
            if (volume >= smva50avg * 1.1) {
                content.push({
                    ...obj,
                    status: 'bullish'
                });
            }
        }
    });
    return content;
};
