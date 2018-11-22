import { format, parse, addDays } from 'date-fns';
import consts from '../consts';
import { cache } from './cache.service';
import Error from '../models/error';
import axios from 'axios';

export class EndOfDayService {
    private dateFormat = 'YYYY-MM-DD';
    private quandlUrl = 'https://www.quandl.com/api/v3/datasets/WIKI';

    /**
     * Return an array of open, high, low, close prices for a ticker symbol for a range of date.
     * @param ticker The ticker symbol
     * @param startDate The start date of the period to calculate
     * @param endDate The end date of the period to calculate
     * @param specificColumn Specifying the column to fetch. If omitted, all data is fetched.
     */
    getDailyStats = async (
        ticker: string,
        startDate?: Date | string,
        endDate?: Date | string,
        specificColumn?: number
    ) => {
        const cachedResult = cache.extractFromCache(ticker, startDate, endDate);
        if (cachedResult) {
            return cachedResult;
        }

        const response = await axios.get(
            `${this.quandlUrl}/${ticker}/data.json`,
            {
                params: {
                    start_date: this.formatDate(startDate),
                    end_date: this.formatDate(endDate),
                    order: 'asc',
                    api_key: process.env.QUANDL_API,
                    column_index: specificColumn
                }
            }
        );
        const dataset = response.data.dataset_data;
        cache.cacheResult(ticker, startDate, endDate, dataset);
        return response.data.dataset_data;
    };

    /**
     * Return an array of close prices for multiple ticker symbols for a range of date.
     * @param tickers The list of ticker symbols
     * @param startDate The start date of the period to calculate
     * @param endDate The end date of the period to calculate
     */
    getClosePrices = async (
        tickers: string[],
        startDate?: Date | string,
        endDate?: Date | string
    ) => {
        const data = [];
        for (const ticker of tickers) {
            const dataset = await this.getDailyStats(
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

    /**
     * Return the close price for one ticker symbol for a range of date.
     * @param ticker The ticker symbol
     * @param startDate The start date of the period to calculate
     * @param endDate The end date of the period to calculate
     */
    getClosePrice = async (
        ticker: string,
        startDate?: Date | string,
        endDate?: Date | string
    ) => {
        const dataset = await this.getDailyStats(
            ticker,
            startDate,
            endDate,
            consts.COLUMN_INDEX.END_OF_DAY
        );
        return {
            ticker,
            startDate: dataset.start_date,
            endDate: dataset.end_date,
            data: dataset.data
        };
    };

    /**
     * Returns the first day that information for this symbol is available
     * @param ticker The ticker's symbol
     */
    getFirstAvailableDate = async (ticker: string) => {
        const result = await axios.get(
            `${this.quandlUrl}/${ticker}/metadata.json`,
            {
                params: {
                    order: 'asc',
                    api_key: process.env.QUANDL_API
                }
            }
        );
        return parse(result.data.dataset.oldest_available_date);
    };

    /**
     * Return the n-day moving average for a ticker symbol beginning with a start date.
     * If not successful, return the first possible date for the ticker.
     * @param ticker The ticker's symbol
     * @param startDate The start date of the period to calculate the moving average of
     * @param days The duration of the period
     */
    getMovingDayAverage = async (
        ticker: string,
        startDate: Date | string,
        days: number
    ) => {
        const eodService = new EndOfDayService();
        try {
            const mda = await this.getAverage(
                ticker,
                this.formatDate(startDate),
                days
            );
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
            if (startDate) {
                const date = await eodService.getFirstAvailableDate(ticker);
                return {
                    succeeded: false,
                    data: new Error(
                        'There is no data in your specified range.',
                        {
                            first_possible_date: date
                        }
                    )
                };
            } else {
                return {
                    succeeded: false,
                    data: new Error(
                        'Start date parameter is missing. Please check your API syntax and try again.'
                    )
                };
            }
        } catch (e) {
            return {
                succeeded: false,
                data: this.createError(e)
            };
        }
    };

    getAverage = async (
        ticker: string,
        startDate: Date | string,
        days: number
    ) => {
        const endDate = addDays(startDate, days);
        const result = await this.getDailyStats(
            ticker,
            startDate,
            endDate,
            consts.COLUMN_INDEX.END_OF_DAY
        );
        const dataset = result.data;
        if (dataset.length) {
            return (
                dataset.reduce(
                    (prev: number, curr: any[]) => prev + curr[1],
                    0
                ) / dataset.length
            );
        }
    };

    private formatDate = (date: Date | string | undefined) => {
        if (typeof date === 'string' || !date) {
            return date;
        }
        return format(date, this.dateFormat);
    };

    private createError = (e: any) => {
        try {
            const data = e.response.data;
            const message = data.quandl_error
                ? data.quandl_error.message
                : undefined;
            delete data.quandl_error;
            return new Error(message, data.errors);
        } catch (e) {}
    };
}
