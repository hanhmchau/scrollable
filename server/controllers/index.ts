import { Request, Response, Router } from 'express';
import asynchronify from '../middlewares/async';
import { closePrice, createError, movingDayAverage, getTickers } from '../services';

const router = Router();

router.get('/tickers', asynchronify(async (req: Request, res: Response) => {
    const { top = 0, search = '' } = { ...req.query };
    const tickers = await getTickers(search, top);
    res.json(tickers);
}));

router.get(
    '/:ticker/close-price',
    asynchronify(async (req: Request, res: Response) => {
        const { startDate = '', endDate = '' } = { ...req.query };
        const ticker = req.params.ticker;
        try {
            const data = await closePrice(ticker, startDate, endDate);
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
                            average: (result.data as any)["200dma"].average
                        };
                        (results as any)[tickers[index]] = {
                            succeeded: true,
                            data: res
                        }
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

export default router;
