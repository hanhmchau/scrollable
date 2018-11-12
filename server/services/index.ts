import axios from 'axios';
import consts from '../consts';
import { format, addDays, parse } from 'date-fns';
const dateFormat = 'YYYY-MM-DD';
const quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';

const getEndOfDays = async (ticker: string, startDate: Date, endDate: Date) => {
    return axios.get(`${quandlUrl}/${ticker}/data.json`, {
        params: {
            start_date: format(startDate, dateFormat),
            end_date: format(endDate, dateFormat),
            order: 'asc',
            api_key: process.env.QUANDL_API,
            column_index: consts.COLUMN_INDEX.END_OF_DAY
        }
    });
};

export const closePrice = async (
    ticker: string,
    startDate: Date,
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

export const getAverage = async (
    ticker: string,
    startDate: Date,
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

export const firstAvailableDate = async (ticker: string) => {
    const result = await axios.get(`${quandlUrl}/${ticker}/metadata.json`, {
        params: {
            order: 'asc',
            api_key: process.env.QUANDL_API
        }
    });
    return parse(result.data.dataset.oldest_available_date);
};
