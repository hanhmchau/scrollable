import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css']
})
export class SearchComponent {
    myControl = new FormControl();
    options: any[] = [
        {
            name: 'One',
            origin: 'US'
        },
        {
            name: 'Two',
            origin: 'UK'
        }
    ];
    filteredOptions: Observable<string[]>;

    ngOnInit() {
        this.filteredOptions = this.myControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value))
        );
    }

    private _filter(value: string): string[] {
        const filterValue = value.toLowerCase();

        return this.options.filter(option =>
            option.name.toLowerCase().includes(filterValue)
        );
    }
}
