import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-search-container',
    templateUrl: './search-container.component.html',
    styleUrls: ['./search-container.component.css']
})
export class SearchContainerComponent {
    constructor(private router: Router) {}

    navigateToTickerPage(ticker: string) {
        this.router.navigate([`/ticker/${ticker}`]);
    }
}
