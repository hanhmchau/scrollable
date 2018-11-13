import axios from 'axios';
import {
    addDays,
    format,
    parse,
    isWithinRange,
    eachDay,
    differenceInCalendarDays,
    isEqual
} from 'date-fns';
import consts from '../consts';
import Error from '../models/error';
import * as NodeCache from 'node-cache';
const dateFormat = 'YYYY-MM-DD';
const quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';
const cache = new NodeCache({ stdTTL: 100, checkperiod: 120 });

export const createError = (e: any) => {
    console.log(e);
    const data = e.response.data;
    const message = data.quandl_error.message;
    delete data.quandl_error;
    return new Error(message, data.errors);
};

const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
        return date;
    }
    return format(date, dateFormat);
};

const getEndOfDays = async (
    ticker: string,
    startDate: Date | string,
    endDate: Date | string
) => {
    const cachedResult: any = cache.get(ticker);
    const start = format(startDate, dateFormat);
    const end = format(endDate, dateFormat);
    if (cachedResult) {
        const data = [];
        for (const res in cachedResult) {
            if (cachedResult.hasOwnProperty(res)) {
                if (isWithinRange(res, start, end)) {
                    data.push([res, cachedResult[res].value]);
                }
            }
        }
        if (differenceInCalendarDays(end, start) + 1 === data.length) {
            return {
                startDate: data[0][0],
                endDate: data[data.length - 1][0],
                data: data.filter(d => d[1] !== -1)
            };
        }
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

    const newCacheResult: any = cachedResult || {};
    const dataset = response.data.dataset_data;
    const dat = dataset.data;
    const receivedStart = format(dataset.start_date, dateFormat);
    const receivedEnd = format(dataset.end_date, dateFormat);
    let i = 0;
    eachDay(startDate || receivedStart, endDate || receivedEnd).forEach(day => {
        if (isEqual(dat[i], day)) {
            newCacheResult[format(day, dateFormat)] = dat[i][1];
            i++;
        } else {
            newCacheResult[format(day, dateFormat)] = -1;
        }
    });
    cache.set(ticker, newCacheResult);
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
    const dataset = result.data.dataset_data;
    if (dataset.data.length) {
        return (
            dataset.data.reduce(
                (prev: number, curr: any[]) => prev + curr[1],
                0
            ) / dataset.data.length
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
