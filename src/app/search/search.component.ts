import { Router } from '@angular/router';
import { TickerService } from './../services/ticker.service';
import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { distinctUntilChanged, debounceTime, switchMap } from 'rxjs/operators';
import Ticker from '../models/ticker';
import { MatAutocompleteSelectedEvent } from '@angular/material';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css']
})
export class SearchComponent {
    myControl = new FormControl();
    filteredOptions: Observable<Ticker[]>;

    constructor(private tickerService: TickerService, private router: Router) {}

    ngOnInit() {
        this.filteredOptions = this.myControl.valueChanges.pipe(
            debounceTime(150),
            distinctUntilChanged(),
            switchMap(value => this.tickerService.searchTickers(value))
        );
    }

    tickerSelected(event: MatAutocompleteSelectedEvent) {
        this.router.navigate([`/ticker/${event.option.value}`]);
    }
}
