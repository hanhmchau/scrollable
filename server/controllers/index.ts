import { Request, Response, Router } from 'express';
import * as stream from 'stream';
import asynchronify from '../middlewares/async';
import Error from '../models/error';
import { EndOfDayService, TickerService, ReportService } from '../services';

const router = Router();

const createError = (e: any) => {
    try {
        const data = e.response.data;
        const message = data.quandl_error
            ? data.quandl_error.message
            : undefined;
        delete data.quandl_error;
        return new Error(message, data.errors);
    } catch (e) {}
};

router.get(
    '/tickers',
    asynchronify(async (req: Request, res: Response) => {
        const { top = 0, search = '' } = { ...req.query };
        const tickerService = new TickerService();
        if (isNaN(parseInt(top, 10))) {
            res.status(400).json({
                error: `You provided ${top} for the number of returned results. This is not a valid number.`
            });
            return;
        }
        const tickers = await tickerService.getTickers(search, top);
        res.json(tickers);
    })
);

router.get(
    '/tickers/close-prices',
    asynchronify(async (req: Request, res: Response) => {
        const { startDate = '', endDate = '', symbols = '' } = { ...req.query };
        const tickers: string[] = symbols.split(',');
        try {
            const eodService = new EndOfDayService();
            const data = await eodService.getClosePrices(
                tickers,
                startDate,
                endDate
            );
            res.json({
                prices: {
                    dateClose: data
                }
            });
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

router.get(
    '/tickers/multi200mda',
    asynchronify(async (req: Request, res: Response) => {
        // tslint:disable-next-line:no-unnecessary-initializer
        const { startDate = '', days = 200 } = { ...req.query };
        const tickerString = req.query.ticker;
        const tickers: string[] = tickerString.split(',');
        const eodService = new EndOfDayService();
        if (startDate) {
            const results: any = {};
            Promise.all(
                tickers.map(ticker =>
                    eodService.getMovingDayAverage(ticker, startDate, days)
                )
            ).then(tickerResults => {
                tickerResults.forEach((result, index) => {
                    if (result.succeeded) {
                        const rez: any = {
                            average: (result.data as any)['200dma'].average
                        };
                        results[tickers[index]] = {
                            succeeded: true,
                            data: rez
                        };
                    } else {
                        results[tickers[index]] = result;
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
    '/tickers/:ticker',
    asynchronify(async (req: Request, res: Response) => {
        const ticker = req.params.ticker;
        try {
            const tickerService = new TickerService();
            const name = await tickerService.getTicker(ticker);
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
    '/tickers/:ticker/close-price',
    asynchronify(async (req: Request, res: Response) => {
        const { startDate = '', endDate = '' } = { ...req.query };
        const ticker = req.params.ticker;
        try {
            const eodService = new EndOfDayService();
            const data = await eodService.getClosePrice(
                ticker,
                startDate,
                endDate
            );
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
    '/tickers/:ticker/200mda',
    asynchronify(async (req: Request, res: Response) => {
        // tslint:disable-next-line:no-unnecessary-initializer
        const { startDate = '', days = 200 } = { ...req.query };
        const ticker = req.params.ticker;
        const eodService = new EndOfDayService();
        const result = await eodService.getMovingDayAverage(
            ticker,
            startDate,
            days
        );
        if (result.succeeded) {
            res.json(result);
        } else {
            res.status(404).json(result);
        }
    })
);

router.get(
    '/tickers/:ticker/download/twap.(json|csv)',
    asynchronify(async (req: Request, res: Response) => {
        const { ticker = '' } = { ...req.params };
        const url = req.originalUrl;
        const format = url.slice(url.indexOf('.') + 1);
        try {
            const reportService = new ReportService();
            const fileName = `${ticker}.${format}`;
            const { content } = await reportService.getHistoricalData(
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

router.get(
    '/tickers/:ticker/download/alerts.dat',
    asynchronify(async (req: Request, res: Response) => {
        const { ticker = '' } = { ...req.params };
        const fileName = 'alerts.dat';
        try {
            const reportService = new ReportService();
            const content = await reportService.getAlertData(ticker);
            const fileContent = Buffer.from(content);
            const readStream = new stream.PassThrough();
            readStream.end(fileContent);
            res.set(
                'Content-disposition',
                'attachment; filename=' + fileName
            ).set('Content-Type', 'text/plain');
            readStream.pipe(res);
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

export default router;
