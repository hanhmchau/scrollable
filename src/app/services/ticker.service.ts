import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import consts from '../../consts';
import GraphInput, { GraphSeries } from '../models/graph-input';
import Ticker from '../models/ticker';

@Injectable({
    providedIn: 'root'
})
export class TickerService {
    constructor(private http: HttpClient) {}
}
