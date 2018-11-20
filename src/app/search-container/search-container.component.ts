import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-search-container',
    templateUrl: './search-container.component.html',
    styleUrls: ['./search-container.component.css']
})
export class SearchContainerComponent {
    search: string = '';
    constructor(private router: Router) {}

    navigateToTickerPage(ticker: string) {
        if (ticker) {
            this.router.navigate([`/ticker/${ticker}`]);
        }
    }

    valueChange(ticker: string) {
        this.search = ticker;
    }
}
