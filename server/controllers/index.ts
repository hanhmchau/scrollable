import { Request, Response, Router } from 'express';
import * as stream from 'stream';
import asynchronify from '../middlewares/async';
import {
    closePrice,
    createError,
    generateHistoricalData,
    getTickers,
    movingDayAverage
} from '../services';
import { getFullName } from './../services/index';

const router = Router();

router.get(
    '/tickers',
    asynchronify(async (req: Request, res: Response) => {
        const { top = 0, search = '' } = { ...req.query };
        if (isNaN(parseInt(top, 10))) {
            res.status(400).json({
                error: `You provided ${top} for the number of returned results. This is not a valid number.`
            });
            return;
        }
        const tickers = await getTickers(search, top);
        res.json(tickers);
    })
);

router.get(
    '/:ticker/full-name',
    asynchronify(async (req: Request, res: Response) => {
        const ticker = req.params.ticker;
        try {
            const name = await getFullName(ticker);
            if (name) {
                res.json(name);
            } else {
                res.status(404).json({
                    message:
                        'You have submitted an incorrect Quandl code. Please check your Quandl codes and try again'
                });
            }
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

router.get(
    '/close-price',
    asynchronify(async (req: Request, res: Response) => {
        const { startDate = '', endDate = '', symbols = '' } = { ...req.query };
        const ticker = req.params.ticker;
        try {
            const data = await closePrice(symbols, startDate, endDate);
            res.json({
                prices: {
                    ticker,
                    dateClose: data
                }
            });
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

router.get(
    '/:ticker/200mda',
    asynchronify(async (req: Request, res: Response) => {
        // tslint:disable-next-line:no-unnecessary-initializer
        const { startDate = '', days = 200 } = { ...req.query };
        const ticker = req.params.ticker;
        const result = await movingDayAverage(ticker, startDate, days);
        res.status(result.succeeded ? 200 : 404).json(result.data);
    })
);

router.get(
    '/multi200mda',
    asynchronify(async (req: Request, res: Response) => {
        // tslint:disable-next-line:no-unnecessary-initializer
        const { startDate = '', days = 200 } = { ...req.query };
        const tickerString = req.query.ticker;
        const tickers: string[] = tickerString.split(',');
        if (startDate) {
            const results = {};
            Promise.all(
                tickers.map(ticker => movingDayAverage(ticker, startDate, days))
            ).then(tickerResults => {
                tickerResults.forEach((result, index) => {
                    if (result.succeeded) {
                        const res = {
                            average: (result.data as any)['200dma'].average
                        };
                        (results as any)[tickers[index]] = {
                            succeeded: true,
                            data: res
                        };
                    } else {
                        (results as any)[tickers[index]] = result;
                    }
                });
                res.json(results);
            });
        } else {
            res.status(404).json({
                message:
                    'Start date parameter is missing. Please check your API syntax and try again'
            });
        }
    })
);

router.get(
    '/:ticker/download/twap.(json|csv)',
    asynchronify(async (req: Request, res: Response) => {
        const { ticker = '' } = { ...req.params };
        const url = req.originalUrl;
        const format = url.slice(url.indexOf('.') + 1);
        try {
            const { content, fileName } = await generateHistoricalData(
                ticker,
                format
            );
            if (content) {
                const fileContent = Buffer.from(content);
                const readStream = new stream.PassThrough();
                readStream.end(fileContent);
                res.set(
                    'Content-disposition',
                    'attachment; filename=' + fileName
                ).set('Content-Type', 'text/plain');
                readStream.pipe(res);
            } else {
                res.status(404).json({
                    message:
                        'Your data format is not supported. Please try again.'
                });
            }
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

export default router;
