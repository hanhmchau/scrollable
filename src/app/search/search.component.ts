import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    ElementRef
} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
    MatAutocomplete,
    MatAutocompleteSelectedEvent,
    MatChipInputEvent
} from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    map,
    switchMap
} from 'rxjs/operators';
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
    selectedTickers: string[] = [];
    separatorKeysCodes: number[] = [ENTER, COMMA];
    removable = true;
    selectable = true;
    @Input() value = '';
    @Input() maxChips = 4;
    @Input() width = '500px';
    @Input() placeholder = 'Input a ticker here...';
    @Input() multiple = false;
    @Input() dontShowThis: string[] = [];
    @Output() onTickerSelected = new EventEmitter<string>();
    @Output() onTickerDeleted = new EventEmitter<string>();
    @Output() onValueChanged = new EventEmitter<string>();
    @ViewChild('auto') matAutocomplete: MatAutocomplete;
    @ViewChild('input') input: ElementRef<HTMLInputElement>;

    constructor(private tickerService: TickerService, private router: Router) {}

    ngOnInit() {
        this.myControl.valueChanges.subscribe(val => {
            this.onValueChanged.emit(val);
        });
        this.filteredOptions = this.myControl.valueChanges.pipe(
            debounceTime(150),
            distinctUntilChanged(),
            switchMap(value => this.tickerService.searchTickers(value)),
            map(tickers =>
                tickers.filter(
                    t =>
                        !this.selectedTickers.includes(t.symbol) &&
                        !this.dontShowThis.includes(t.symbol)
                )
            )
        );
    }

    tickerSelected(event: MatAutocompleteSelectedEvent) {
        const ticker = event.option.value;
        if (this.multiple) {
            if (this.selectedTickers.length >= this.maxChips) {
                return;
            }
            this.selectedTickers.push(ticker);
        }
        this.onTickerSelected.emit(ticker);
        this.clearInput();
    }

    remove(ticker: string) {
        this.selectedTickers = this.selectedTickers.filter(t => t !== ticker);
        this.onTickerDeleted.emit(ticker);
    }

    add(event: MatChipInputEvent): void {
        // Add fruit only when MatAutocomplete is not open
        // To make sure this does not conflict with OptionSelected Event
        if (!this.matAutocomplete.isOpen) {
            this.clearInput();
        }
    }

    clearInput(): void {
        this.input.nativeElement.value = '';
        this.myControl.setValue(null);
    }
}
