import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-not-found',
    templateUrl: './not-found.component.html',
    styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent {
    @Input() message = 'There\'s nothing in this page.';
    @Input() showHomeLink = true;
}
