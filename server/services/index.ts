import axios from 'axios';
import { addDays, format, parse } from 'date-fns';
import consts from '../consts';
import Error from '../models/error';
const dateFormat = 'YYYY-MM-DD';
const quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';

export const createError = (e: any) => {
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
    return axios.get(`${quandlUrl}/${ticker}/data.json`, {
        params: {
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            order: 'asc',
            api_key: process.env.QUANDL_API,
            column_index: consts.COLUMN_INDEX.END_OF_DAY
        }
    });
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
    endDate: Date
) => {
    const result = await getEndOfDays(ticker, startDate, endDate);
    const dataset = result.data.dataset_data;
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
