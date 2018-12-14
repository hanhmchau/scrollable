import { Component, ViewChild } from '@angular/core';
import { ScrollableComponent } from './scrollable/scrollable.component';
import { MatSlideToggleChange } from '@angular/material';
import * as lorem from 'lorem-ipsum';

interface Event {
    target: string;
    timestamp: Date;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    @ViewChild('scrollable') scrollable: ScrollableComponent;
    private height = 300;
    private events: Event[] = [];
    private autoHide = true;
    private content = '';

    ngOnInit(): void {
        this.generateLoremIpsum();
    }

    generateLoremIpsum() {
        this.content += lorem({
            count: 10000,
            units: 'words',
            format: 'html'
        });
    }

    onReachedTop() {
        this.events.push({
            target: 'top',
            timestamp: new Date()
        });
    }

    onReachedBottom() {
        this.events.push({
            target: 'bottom',
            timestamp: new Date()
        });
    }

    onChangeAutoHide(e: MatSlideToggleChange) {
        this.autoHide = e.checked;
    }

    generateData() {

    }

    scrollTop() {
        this.scrollable.scrollToTop().subscribe();
    }

    scrollBottom() {
        this.scrollable.scrollToBottom().subscribe();
    }
}
