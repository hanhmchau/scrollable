import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import Ticker from '../models/ticker';
import { TickerService } from './../services/ticker.service';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css']
})
export class SearchComponent {
    myControl = new FormControl();
    filteredOptions: Observable<Ticker[]>;
    @Output() onTickerSelected = new EventEmitter<string>();

    constructor(private tickerService: TickerService, private router: Router) {}

    ngOnInit() {
        this.filteredOptions = this.myControl.valueChanges.pipe(
            debounceTime(150),
            distinctUntilChanged(),
            switchMap(value => this.tickerService.searchTickers(value))
        );
    }

    tickerSelected(event: MatAutocompleteSelectedEvent) {
        this.onTickerSelected.emit(event.option.value);
    }
}
