import { EndOfDayService } from './eod.service';
import { parse as json2csv } from 'json2csv';
import { isToday, addDays } from 'date-fns';
import { LMWACalculator } from './../utils/lwma';
import { SMACalculator } from './../utils/sma';
import * as NodeCache from 'node-cache';
import { cache } from './cache.service';

export class ReportService {
    private eodService: EndOfDayService;

    constructor() {
        this.eodService = new EndOfDayService();
    }

    /**
     * Returns all historical data for a ticker symbol with TWAP values
     * @param ticker The symbol of the ticker to generate data for
     * @param fileFormat The format of the generated file
     */
    getHistoricalData = async (ticker: string, fileFormat: string) => {
        const data = await this.generateHistoricalData(ticker);
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

    /**
     * Returns all historical alerts for a ticker symbol for bullish or bearish situations
     * @param ticker The symbol of the ticker to generate data for
     */
    getAlertData = async (ticker: string) => {
        const data = await this.generateAlertData(ticker);
        return data.map(obj => this.linifyObject(obj)).join('\n');
    };

    private generateHistoricalData = async (ticker: string) => {
        const cachedHistoricalData = cache.getHistoricalData(ticker);
        if (cachedHistoricalData && isToday(cachedHistoricalData.fetchedDay)) {
            return cachedHistoricalData.data;
        }
        let twapValues;
        if (!cachedHistoricalData) {
            const dataset = await this.eodService.getDailyStats(ticker);
            const data: any[][] = dataset.data;
            twapValues = this.calculateTwapValues(data);
        } else {
            const dataset = await this.eodService.getDailyStats(
                ticker,
                addDays(cachedHistoricalData.fetchedDay, 1)
            );
            const data: any[][] = [
                ...cachedHistoricalData.data,
                ...dataset.data
            ];
            twapValues = this.calculateTwapValues(data);
        }
        cache.cacheHistoricalData(ticker, twapValues);
        return twapValues;
    };

    private generateAlertData = async (ticker: string): Promise<any[]> => {
        const cachedData = cache.getHistoricalData(ticker);
        if (cachedData && isToday(cachedData.fetchedDay)) {
            return cachedData.data;
        }
        let twapValues;
        if (!cachedData) {
            const dataset = await this.eodService.getDailyStats(ticker);
            const data: any[][] = dataset.data;
            twapValues = this.calculateAlertData(data, ticker);
        } else {
            const dataset = await this.eodService.getDailyStats(
                ticker,
                addDays(cachedData.fetchedDay, 1)
            );
            const data: any[][] = [...cachedData.data, ...dataset.data];
            twapValues = this.calculateAlertData(data, ticker);
        }
        cache.cacheHistoricalData(ticker, twapValues);
        return twapValues;
    };

    private calculateTwapValues = (data: any[]): any[] => {
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

    private calculateAlertData = (data: any[], ticker: string): any[] => {
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

    private linifyObject = ({
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
}
