import { Ticker } from './../models/ticker';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Class containing methods with ticker symbols
 */
export class TickerService {
    private readFile = promisify(fs.readFile);

    /**
     * Returns the information of the ticker symbol. Returns undefined if not found.
     * @param symbol The ticker symbol of the symbol
     */
    getTicker = async (symbol: string): Promise<Ticker> => {
        const data = await this.readFile(
            path.join(__dirname, '../tickers.json')
        );
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
    }

    /**
     * Returns all the tickers containing the search query. The search is case-insensitive.
     * @param search The keyword to filter the tickers
     * @param top The maximum number of tickers returned
     * Returns an empty array if no match is found.
     */
    getTickers = async (search: string, top: number): Promise<Ticker[]> => {
        const data = await this.readFile(
            path.join(__dirname, '../tickers.json')
        );
        let tickers: any[] = JSON.parse(data.toString()).sort(
            (a: any, b: any) => {
                const tickerA: string = a.symbol;
                const tickerB: string = b.symbol;
                if (tickerA.startsWith(search.toUpperCase())) {
                    return -1;
                }
                if (tickerB.startsWith(search.toUpperCase())) {
                    return 1;
                }
                return tickerA.localeCompare(tickerB);
            }
        );
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
    }
}
