import { firstAvailableDate, getAverage } from './../services/index';
import { Router, Request, Response } from 'express';
import asynchronify from '../middlewares/async';
import { parse } from 'date-fns';
import { closePrice } from '../services';
import Error from '../models/error';

const router = Router();

const createError = (e: any) => {
    const data = e.response.data;
    const message = data.quandl_error.message;
    delete data.quandl_error;
    return new Error(message, data.errors);
};

router.get(
    '/:ticker/close-price',
    asynchronify(async (req: Request, res: Response) => {
        const { startDate = '', endDate = '' } = { ...req.query };
        const ticker = req.params.ticker;
        try {
            const data = await closePrice(
                ticker,
                parse(startDate),
                parse(endDate)
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
    '/:ticker/200mda',
    asynchronify(async (req: Request, res: Response) => {
        // tslint:disable-next-line:no-unnecessary-initializer
        const { startDate = '', days = 200 } = { ...req.query };
        const ticker = req.params.ticker;
        try {
            if (startDate) {
                const mda = await getAverage(ticker, startDate, days);
                if (mda) {
                    res.json({
                        '200dma': {
                            ticker,
                            average: mda
                        }
                    });
                    return;
                }
            }
            const date = firstAvailableDate(ticker);
            res.status(404).json(
                new Error(
                    'Start date parameter is missing. Please check your API syntax and try again.',
                    {
                        first_possible_date: date
                    }
                )
            );
        } catch (e) {
            res.status(404).json(createError(e));
        }
    })
);

export default router;
